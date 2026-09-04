import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const superuserGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasRole('Superuser')) {
    return true;
  }

  router.navigate(['/']);
  return false;
};

export const mentorOrHigherGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.hasRole('Mentor') || authService.hasRole('Coordinator') || authService.hasRole('Superuser')) {
    return true;
  }

  router.navigate(['/']);
  return false;
};

