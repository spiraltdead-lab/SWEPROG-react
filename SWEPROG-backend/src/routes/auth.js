const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { sendWelcomeEmail } = require('../services/email.service');
const { validateLang } = require('../i18n');

// Hjälpfunktion — skapar JWT, kastar om JWT_SECRET saknas
const signToken = (payload) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET saknas');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const db = req.app.locals.db;

    const [users] = await db.promise().query(
      'SELECT id, email, password_hash, name, role, two_factor_enabled FROM users WHERE email = ? AND is_active = 1',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    await db.promise().query(
      'UPDATE users SET last_login_at = NOW(), last_login_ip = ? WHERE id = ?',
      [req.ip, user.id]
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        twoFactorEnabled: user.two_factor_enabled === 1
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ett internt serverfel uppstod' });
  }
});

// POST /api/auth/register/guest
router.post('/register/guest', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Lösenordet måste vara minst 8 tecken'),
  body('name').notEmpty().withMessage('Namn krävs'),
  body('acceptTerms').equals('true').withMessage('Du måste godkänna villkoren')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;
    const db = req.app.locals.db;

    const [existing] = await db.promise().query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'E-postadressen finns redan' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await db.promise().query(
      'INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, "guest", 1)',
      [name, email, passwordHash]
    );

    const token = signToken({
      userId: result.insertId,
      email,
      role: 'guest'
    });

    // Send welcome email — fire-and-forget so registration is never blocked by email errors
    const lang = validateLang(req.body.lang);
    sendWelcomeEmail({ name, email, lang }).catch(err =>
      console.error('Welcome email failed (non-fatal):', err.message)
    );

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        email,
        name,
        role: 'guest',
        twoFactorEnabled: false
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ett internt serverfel uppstod' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const db = req.app.locals.db;
    const [users] = await db.promise().query(
      'SELECT id, email, name, role, two_factor_enabled, last_login_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Användare hittades inte' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Ett internt serverfel uppstod' });
  }
});

module.exports = router;
