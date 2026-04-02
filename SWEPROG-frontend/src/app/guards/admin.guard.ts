import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

/** Guards routes that require admin or super_admin. */
export const adminGuard = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.hasPermission('access_admin')) return true;

  return router.parseUrl('/dashboard');
};
