import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Kolla både AuthService-state OCH localStorage direkt
  // för att hantera sidomladdning korrekt
  const hasToken = !!localStorage.getItem('token');
  const hasUser  = !!localStorage.getItem('user');

  if (authService.isLoggedIn || (hasToken && hasUser)) {
    return true;
  }

  return router.parseUrl('/login');
};
