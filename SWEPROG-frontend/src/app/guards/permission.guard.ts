import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';
import { Permission } from '../models/permissions';

/**
 * Factory guard for permission-based access control.
 * Usage in routes: canActivate: [authGuard, permissionGuard('access_admin')]
 */
export const permissionGuard = (permission: Permission) => () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.hasPermission(permission)) return true;

  // Redirect: authenticated but lacks permission → dashboard
  if (auth.isLoggedIn) return router.parseUrl('/dashboard');

  // Not authenticated → login
  return router.parseUrl('/login');
};
