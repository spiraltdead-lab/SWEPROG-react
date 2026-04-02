import { UserRole } from '../services/auth';

export type Permission =
  | 'access_admin'
  | 'manage_users'
  | 'manage_super_admins'
  | 'view_super_admins'
  | 'assign_admin_role'
  | 'delete_any_user';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
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
