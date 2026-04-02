const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const { body, validationResult } = require('express-validator');
const authenticate             = require('../middleware/auth');
const { requirePermission, hasPermission } = require('../middleware/rbac');

// All admin routes require authentication + access_admin permission
router.use(authenticate, requirePermission('access_admin'));

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const db    = req.app.locals.db;
    const canViewSuperAdmins = hasPermission(req.user.role, 'view_super_admins');

    const whereClause = canViewSuperAdmins ? '' : "WHERE role != 'super_admin'";

    const [users] = await db.promise().query(`
      SELECT id, name, email, role,
             CASE WHEN is_active = 1 THEN 'active' ELSE 'inactive' END AS status,
             created_at  AS createdAt,
             last_login_at AS lastLogin
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
    `);

    res.json({ success: true, data: users });
  } catch (err) {
    console.error('GET /admin/users:', err);
    res.status(500).json({ success: false, message: 'Kunde inte hämta användare' });
  }
});

// ─── POST /api/admin/users ────────────────────────────────────────────────────
router.post('/users', [
  body('name').trim().notEmpty().withMessage('Namn krävs'),
  body('email').isEmail().normalizeEmail().withMessage('Ogiltig e-postadress'),
  body('password').isLength({ min: 8 }).withMessage('Lösenordet måste vara minst 8 tecken'),
  body('role').isIn(['guest', 'user', 'admin', 'super_admin']).withMessage('Ogiltig roll')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { name, email, password, role } = req.body;

  // Only super_admin may assign admin/super_admin roles
  if (['admin', 'super_admin'].includes(role) && !hasPermission(req.user.role, 'assign_admin_role')) {
    return res.status(403).json({ success: false, message: 'Du har inte behörighet att tilldela den rollen' });
  }

  const db = req.app.locals.db;
  try {
    const [existing] = await db.promise().query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'E-postadressen finns redan' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.promise().query(
      'INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)',
      [name, email, passwordHash, role]
    );

    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (err) {
    console.error('POST /admin/users:', err);
    res.status(500).json({ success: false, message: 'Kunde inte skapa användare' });
  }
});

// ─── PUT /api/admin/users/:id ─────────────────────────────────────────────────
router.put('/users/:id', [
  body('name').optional().trim().notEmpty().withMessage('Namn får inte vara tomt'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Ogiltig e-postadress'),
  body('role').optional().isIn(['guest', 'user', 'admin', 'super_admin']).withMessage('Ogiltig roll')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { id } = req.params;
  const { name, email, role } = req.body;
  const db = req.app.locals.db;

  try {
    // Fetch target user to enforce role-based restrictions
    const [targets] = await db.promise().query('SELECT role FROM users WHERE id = ?', [id]);
    if (targets.length === 0) {
      return res.status(404).json({ success: false, message: 'Användaren hittades inte' });
    }
    const targetRole = targets[0].role;

    // Only super_admin may edit super_admin users
    if (targetRole === 'super_admin' && !hasPermission(req.user.role, 'manage_super_admins')) {
      return res.status(403).json({ success: false, message: 'Du har inte behörighet att redigera den här användaren' });
    }

    // Only super_admin may assign admin/super_admin roles
    if (role && ['admin', 'super_admin'].includes(role) && !hasPermission(req.user.role, 'assign_admin_role')) {
      return res.status(403).json({ success: false, message: 'Du har inte behörighet att tilldela den rollen' });
    }

    if (email) {
      const [dup] = await db.promise().query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (dup.length > 0) {
        return res.status(409).json({ success: false, message: 'E-postadressen används redan' });
      }
    }

    const fields = [];
    const values = [];
    if (name)  { fields.push('name = ?');  values.push(name); }
    if (email) { fields.push('email = ?'); values.push(email); }
    if (role)  { fields.push('role = ?');  values.push(role); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Inga fält att uppdatera' });
    }

    values.push(id);
    await db.promise().query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    res.json({ success: true });
  } catch (err) {
    console.error('PUT /admin/users/:id:', err);
    res.status(500).json({ success: false, message: 'Kunde inte uppdatera användare' });
  }
});

// ─── PATCH /api/admin/users/:id/status ───────────────────────────────────────
router.patch('/users/:id/status', [
  body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Ogiltig status')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  const { id }     = req.params;
  const { status } = req.body;
  const db         = req.app.locals.db;

  try {
    const [targets] = await db.promise().query('SELECT role FROM users WHERE id = ?', [id]);
    if (targets.length === 0) {
      return res.status(404).json({ success: false, message: 'Användaren hittades inte' });
    }

    if (targets[0].role === 'super_admin' && !hasPermission(req.user.role, 'manage_super_admins')) {
      return res.status(403).json({ success: false, message: 'Åtkomst nekad' });
    }

    const isActive = status === 'active' ? 1 : 0;
    await db.promise().query('UPDATE users SET is_active = ? WHERE id = ?', [isActive, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /admin/users/:id/status:', err);
    res.status(500).json({ success: false, message: 'Kunde inte ändra status' });
  }
});

// ─── DELETE /api/admin/users/:id ──────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  const { id } = req.params;
  const db     = req.app.locals.db;

  if (String(req.user.userId) === String(id)) {
    return res.status(400).json({ success: false, message: 'Du kan inte ta bort ditt eget konto' });
  }

  try {
    const [targets] = await db.promise().query('SELECT role FROM users WHERE id = ?', [id]);
    if (targets.length === 0) {
      return res.status(404).json({ success: false, message: 'Användaren hittades inte' });
    }

    if (targets[0].role === 'super_admin' && !hasPermission(req.user.role, 'delete_any_user')) {
      return res.status(403).json({ success: false, message: 'Du har inte behörighet att ta bort den här användaren' });
    }

    await db.promise().query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /admin/users/:id:', err);
    res.status(500).json({ success: false, message: 'Kunde inte ta bort användare' });
  }
});

// ─── POST /api/admin/users/:id/reset-password ─────────────────────────────────
router.post('/users/:id/reset-password', async (req, res) => {
  res.json({ success: true, message: 'Lösenordsåterställning är inte konfigurerad ännu' });
});

module.exports = router;
