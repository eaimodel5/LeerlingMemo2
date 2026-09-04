import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';
import { Recht } from './rechten';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

/**
 * Laat alleen door wie het genoemde recht heeft.
 *
 * Vervangt de losse rolcontroles in de guards. Die vergeleken een rol
 * rechtstreeks, waardoor de routetabel en `firestore.rules` los van elkaar
 * konden verschuiven — en dat gebeurde ook: vier mentorschermen stonden op
 * `authGuard`, die alleen kijkt óf je bent ingelogd en niet wát je bent. Ze
 * waren daarmee via de URL te openen door een vakdocent, met alle memo's van de
 * hele school erin.
 */
export function rechtGuard(recht: Recht): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    if (authService.mag(recht)) {
      return true;
    }

    router.navigate(['/']);
    return false;
  };
}

export const superuserGuard: CanActivateFn = rechtGuard('systeembeheer');

export const mentorOrHigherGuard: CanActivateFn = rechtGuard('voorbereidingBewerken');
