import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { UserRole } from '../models/data.models';
import { AuthService } from './auth.service';
import { Recht } from './rechten';
import { authGuard, mentorOrHigherGuard, rechtGuard, superuserGuard } from './auth.guard';
import { NepAuthService } from '../../testing/testbed';

/**
 * De vier rollen langs de routetabel.
 *
 * Dit is de test die het gat uit PR 7 had gevangen: vier mentorschermen stonden
 * op `authGuard`, die alleen kijkt of je bent ingelogd. Het menu verborg de
 * links voor een vakdocent, maar wie de URL intypte kwam er gewoon in.
 */

let auth: NepAuthService;
let gegaanNaar: string[];

function zetOp(rol: UserRole | null) {
  auth = new NepAuthService();
  if (rol) auth.logIn(rol);
  gegaanNaar = [];

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: auth as unknown as AuthService }],
  });

  const router = TestBed.inject(Router);
  router.navigate = ((commands: unknown[]) => {
    gegaanNaar.push(String(commands[0]));
    return Promise.resolve(true);
  }) as Router['navigate'];
}

/** Draait een guard alsof de router een route wil openen. */
function mag(guard: typeof authGuard): boolean {
  return TestBed.runInInjectionContext(
    () => guard(null as never, null as never) as boolean,
  );
}

const ROLLEN: UserRole[] = ['Docent', 'Mentor', 'Coordinator', 'Superuser'];

describe('authGuard: alleen ingelogd', () => {
  it('stuurt een uitgelogde bezoeker naar de inlogpagina', () => {
    zetOp(null);
    expect(mag(authGuard)).toBe(false);
    expect(gegaanNaar).toEqual(['/login']);
  });

  it('laat elke ingelogde rol door', () => {
    for (const rol of ROLLEN) {
      zetOp(rol);
      expect(mag(authGuard), rol).toBe(true);
    }
  });
});

describe('mentorOrHigherGuard: de mentorschermen', () => {
  it('houdt een vakdocent tegen', () => {
    zetOp('Docent');
    expect(mag(mentorOrHigherGuard)).toBe(false);
    expect(gegaanNaar).toEqual(['/']);
  });

  it('laat mentor, coordinator en beheerder door', () => {
    for (const rol of ['Mentor', 'Coordinator', 'Superuser'] as const) {
      zetOp(rol);
      expect(mag(mentorOrHigherGuard), rol).toBe(true);
    }
  });

  it('stuurt een uitgelogde bezoeker naar de inlogpagina, niet naar de startpagina', () => {
    zetOp(null);
    expect(mag(mentorOrHigherGuard)).toBe(false);
    expect(gegaanNaar).toEqual(['/login']);
  });
});

describe('superuserGuard: het beheerdersdeel', () => {
  it('laat alleen de beheerder door', () => {
    for (const rol of ROLLEN) {
      zetOp(rol);
      expect(mag(superuserGuard), rol).toBe(rol === 'Superuser');
    }
  });
});

describe('rechtGuard: per handeling', () => {
  const verwacht: [Recht, UserRole[]][] = [
    ['leerlingenBewerken', ['Mentor', 'Coordinator', 'Superuser']],
    ['docentkoppelingBewerken', ['Mentor', 'Coordinator', 'Superuser']],
    ['systeembeheer', ['Superuser']],
  ];

  for (const [recht, toegestaan] of verwacht) {
    it(`${recht}: ${toegestaan.join(', ')}`, () => {
      const guard = rechtGuard(recht);
      for (const rol of ROLLEN) {
        zetOp(rol);
        expect(mag(guard), `${recht} als ${rol}`).toBe(toegestaan.includes(rol));
      }
    });
  }
});

describe('de routetabel zoals hij hoort te zijn', () => {
  // Eén overzicht dat leest als de tabel in BEVEILIGING.md, zodat een
  // verschuiving van een guard hier zichtbaar wordt en niet pas in gebruik.
  const routes: [string, typeof authGuard, UserRole[]][] = [
    ['/teacher-dashboard', authGuard, ROLLEN],
    ['/memo-1', authGuard, ROLLEN],
    ['/mentor-overview', mentorOrHigherGuard, ['Mentor', 'Coordinator', 'Superuser']],
    ['/mentor-prep', mentorOrHigherGuard, ['Mentor', 'Coordinator', 'Superuser']],
    ['/progress-plan', mentorOrHigherGuard, ['Mentor', 'Coordinator', 'Superuser']],
    ['/magister-export', mentorOrHigherGuard, ['Mentor', 'Coordinator', 'Superuser']],
    ['/manage-students', rechtGuard('leerlingenBewerken'), ['Mentor', 'Coordinator', 'Superuser']],
    ['/manage-teachers', rechtGuard('docentkoppelingBewerken'), ['Mentor', 'Coordinator', 'Superuser']],
    ['/beheer', superuserGuard, ['Superuser']],
    ['/superuser', superuserGuard, ['Superuser']],
  ];

  for (const [pad, guard, toegestaan] of routes) {
    it(pad, () => {
      for (const rol of ROLLEN) {
        zetOp(rol);
        expect(mag(guard), `${pad} als ${rol}`).toBe(toegestaan.includes(rol));
      }
    });
  }
});

beforeEach(() => {
  gegaanNaar = [];
});
