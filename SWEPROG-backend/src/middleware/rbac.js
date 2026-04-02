/**
 * Role-Based / Permission-Based Access Control (RBAC/PBAC)
 * Roles map to explicit permission sets — no hardcoded role checks in routes.
 */

const ROLE_PERMISSIONS = {
  super_admin: [
    'access_admin',
    'manage_users',
    'manage_super_admins',
    'view_super_admins',
    'assign_admin_role',
    'delete_any_user'
  ],
  admin: [
    'access_admin',
    'manage_users'
  ],
  user:  [],
  guest: []
};

function hasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

/**
 * Express middleware factory.
 * Usage: router.use(requirePermission('access_admin'))
 */
function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user?.role, permission)) {
      return res.status(403).json({ success: false, message: 'Åtkomst nekad — otillräckliga behörigheter' });
    }
    next();
  };
}

module.exports = { ROLE_PERMISSIONS, hasPermission, requirePermission };
