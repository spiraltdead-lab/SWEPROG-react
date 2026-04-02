'use strict';

const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcrypt');
const crypto     = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit  = require('express-rate-limit');
const authenticate             = require('../middleware/auth');
const { hasPermission }        = require('../middleware/rbac');
const { sendPasswordResetEmail } = require('../services/email.service');
const { tApi, validateLang }   = require('../i18n');

// ─── Rate limiters ────────────────────────────────────────────────────────────

const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // The message is resolved at request time via the handler, so we use a function
  handler: (req, res) => {
    const lang = validateLang(req.body?.lang || req.query?.lang);
    res.status(429).json({ success: false, message: tApi(lang, 'password.tooManyRequests') });
  }
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const lang = validateLang(req.body?.lang || req.query?.lang);
    res.status(429).json({ success: false, message: tApi(lang, 'password.tooManyRequests') });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
}

async function logPasswordChange(db, action, actorId, targetId, ip, metadata = {}) {
  await db.promise().query(
    'INSERT INTO password_change_log (action, actor_user_id, target_user_id, ip_address, metadata) VALUES (?, ?, ?, ?, ?)',
    [action, actorId ?? null, targetId, ip, JSON.stringify(metadata)]
  );
}

// ─── POST /api/password/change — authenticated user changes own password ──────

router.post('/change', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  const lang = validateLang(req.body.lang);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const field = errors.array()[0].path;
    const msg = field === 'currentPassword'
      ? tApi(lang, 'password.currentPasswordRequired')
      : tApi(lang, 'password.passwordTooShort');
    return res.status(400).json({ success: false, message: msg });
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;
  const db = req.app.locals.db;

  try {
    const [rows] = await db.promise().query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: tApi(lang, 'password.userNotFound') });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ success: false, message: tApi(lang, 'password.currentPasswordWrong') });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.promise().query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    await logPasswordChange(db, 'self_change', userId, userId, getIp(req));

    res.json({ success: true, message: tApi(lang, 'password.updated') });
  } catch (err) {
    console.error('POST /password/change:', err);
    res.status(500).json({ success: false, message: tApi(lang, 'password.serverError') });
  }
});

// ─── POST /api/password/admin/change/:id — admin sets another user's password ─

router.post('/admin/change/:id', authenticate, [
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  const lang = validateLang(req.body.lang);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: tApi(lang, 'password.passwordTooShort') });
  }

  if (!hasPermission(req.user.role, 'manage_users')) {
    return res.status(403).json({ success: false, message: tApi(lang, 'password.accessDenied') });
  }

  const { id } = req.params;
  const { newPassword } = req.body;
  const actorId = req.user.userId;
  const db = req.app.locals.db;

  try {
    const [targets] = await db.promise().query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (targets.length === 0) {
      return res.status(404).json({ success: false, message: tApi(lang, 'password.userNotFound') });
    }

    if (targets[0].role === 'super_admin' && !hasPermission(req.user.role, 'manage_super_admins')) {
      return res.status(403).json({ success: false, message: tApi(lang, 'password.noPermission') });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await db.promise().query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);
    await logPasswordChange(db, 'admin_change', actorId, parseInt(id), getIp(req), { adminRole: req.user.role });

    res.json({ success: true, message: tApi(lang, 'password.updated') });
  } catch (err) {
    console.error('POST /password/admin/change/:id:', err);
    res.status(500).json({ success: false, message: tApi(lang, 'password.serverError') });
  }
});

// ─── POST /api/password/forgot ────────────────────────────────────────────────
// Always returns the same generic response to prevent user enumeration.

router.post('/forgot', forgotLimiter, [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const lang = validateLang(req.body.lang);

  // Generic response — same regardless of whether email exists (prevents user enumeration)
  const GENERIC = { success: true, message: tApi(lang, 'password.genericForgot') };

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Invalid email format — safe to surface this (not user-existence information)
    return res.status(400).json({ success: false, message: tApi(lang, 'password.invalidEmail') });
  }

  const { email } = req.body;
  const db = req.app.locals.db;

  try {
    const [users] = await db.promise().query(
      'SELECT id FROM users WHERE email = ? AND is_active = 1', [email]
    );
    if (users.length === 0) return res.json(GENERIC);

    const userId = users[0].id;

    // Invalidate any still-valid unused tokens for this user
    await db.promise().query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL AND expires_at > NOW()',
      [userId]
    );

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.promise().query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, ip_address) VALUES (?, ?, ?, ?)',
      [userId, tokenHash, expiresAt, getIp(req)]
    );

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail({ email, resetUrl, lang });

    res.json(GENERIC);
  } catch (err) {
    console.error('POST /password/forgot:', err);
    res.json(GENERIC); // Never expose errors — prevents information leak
  }
});

// ─── GET /api/password/reset/validate/:token ──────────────────────────────────

router.get('/reset/validate/:token', async (req, res) => {
  const lang = validateLang(req.query.lang);
  const { token } = req.params;
  const db = req.app.locals.db;

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await db.promise().query(
      'SELECT id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()',
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: tApi(lang, 'password.tokenInvalid') });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('GET /password/reset/validate:', err);
    res.status(500).json({ success: false, message: tApi(lang, 'password.serverError') });
  }
});

// ─── POST /api/password/reset ─────────────────────────────────────────────────

router.post('/reset', resetLimiter, [
  body('token').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  const lang = validateLang(req.body.lang);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const field = errors.array()[0].path;
    const msg = field === 'token'
      ? tApi(lang, 'password.tokenRequired')
      : tApi(lang, 'password.passwordTooShort');
    return res.status(400).json({ success: false, message: msg });
  }

  const { token, newPassword } = req.body;
  const db = req.app.locals.db;

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const [rows] = await db.promise().query(
      `SELECT t.id, t.user_id
       FROM password_reset_tokens t
       WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > NOW()`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: tApi(lang, 'password.tokenInvalid') });
    }

    const { id: tokenId, user_id: userId } = rows[0];

    const hash = await bcrypt.hash(newPassword, 10);
    await db.promise().query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

    // Mark token as used — single-use enforcement
    await db.promise().query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [tokenId]);

    await logPasswordChange(db, 'reset_via_token', null, userId, getIp(req));

    res.json({ success: true, message: tApi(lang, 'password.reset') });
  } catch (err) {
    console.error('POST /password/reset:', err);
    res.status(500).json({ success: false, message: tApi(lang, 'password.serverError') });
  }
});

module.exports = router;
