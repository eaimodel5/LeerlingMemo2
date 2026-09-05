import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService, AuthUser } from './auth.service';
import { DataService } from './data.service';

describe('AuthService', () => {
  let auth: AuthService;
  let stopListeners: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();

    sessionStorage.clear();
    localStorage.clear();

    stopListeners = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: DataService,
          useValue: {
            stopListeners,
          },
        },
      ],
    });

    const router = TestBed.inject(Router);
    router.navigate = vi.fn().mockResolvedValue(true);

    auth = TestBed.inject(AuthService);
  });

  it('start uitgelogd als er geen opgeslagen sessie is', () => {
    expect(auth.currentUser()).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
  });

  it('kan een moderne docentidentiteit met docentAfkorting bewaren', () => {
    const gebruiker: AuthUser = {
      name: 'Hans Visser',
      email: 'visser@school.nl',
      role: 'Docent',
      code: 'ABCD-1234',
      docentAfkorting: 'vis',
    };

    auth.currentUser.set(gebruiker);

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.currentUser()?.docentAfkorting).toBe('vis');
    expect(auth.currentUser()?.name).toBe('Hans Visser');
    expect(auth.currentUser()?.code).toBe('ABCD-1234');
  });

  it('ondersteunt tijdens de overgang ook een legacygebruiker zonder docentAfkorting', () => {
    const gebruiker: AuthUser = {
      name: 'Hans Visser',
      email: 'visser@school.nl',
      role: 'Docent',
      code: 'ABCD-1234',
    };

    auth.currentUser.set(gebruiker);

    expect(auth.isLoggedIn()).toBe(true);
    expect(auth.currentUser()?.docentAfkorting).toBeUndefined();
  });

  it('verzint geen docentAfkorting uit naam of e-mailadres', () => {
    const gebruiker: AuthUser = {
      name: 'Hans Visser',
      email: 'vis@school.nl',
      role: 'Docent',
      code: 'ABCD-1234',
    };

    auth.currentUser.set(gebruiker);

    expect(auth.currentUser()?.docentAfkorting).toBeUndefined();
  });

  it('herkent de rol van de ingelogde gebruiker', () => {
    auth.currentUser.set({
      name: 'Hans Visser',
      email: 'visser@school.nl',
      role: 'Mentor',
      code: 'ABCD-1234',
      docentAfkorting: 'vis',
    });

    expect(auth.hasRole('Mentor')).toBe(true);
    expect(auth.hasRole('Docent')).toBe(false);
    expect(auth.hasRole('Coordinator')).toBe(false);
    expect(auth.hasRole('Superuser')).toBe(false);
  });

  it('gebruikt de centrale rechtencontrole voor handelingen', () => {
    auth.currentUser.set({
      name: 'Hans Visser',
      email: 'visser@school.nl',
      role: 'Mentor',
      code: 'ABCD-1234',
      docentAfkorting: 'vis',
    });

    expect(auth.mag('leerlingenBewerken')).toBe(true);
    expect(auth.mag('systeembeheer')).toBe(false);
  });

  it('geeft geen rechten als niemand is ingelogd', () => {
    expect(auth.mag('leerlingenBewerken')).toBe(false);
    expect(auth.mag('systeembeheer')).toBe(false);
  });

  it('verwijdert een oude opgeslagen sessie zonder toegangscode', () => {
    TestBed.resetTestingModule();

    sessionStorage.setItem(
      'leerlingmemo_auth',
      JSON.stringify({
        name: 'Hans Visser',
        email: 'visser@school.nl',
        role: 'Docent',
        docentAfkorting: 'vis',
      }),
    );

    localStorage.setItem(
      'leerlingmemo_auth',
      JSON.stringify({
        name: 'Hans Visser',
        email: 'visser@school.nl',
        role: 'Docent',
        docentAfkorting: 'vis',
      }),
    );

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: DataService,
          useValue: {
            stopListeners: vi.fn(),
          },
        },
      ],
    });

    const opnieuw = TestBed.inject(AuthService);

    expect(opnieuw.currentUser()).toBeNull();
    expect(sessionStorage.getItem('leerlingmemo_auth')).toBeNull();
    expect(localStorage.getItem('leerlingmemo_auth')).toBeNull();
  });

  it('ruimt onleesbare browseropslag op', () => {
    TestBed.resetTestingModule();

    sessionStorage.setItem(
      'leerlingmemo_auth',
      'dit-is-geen-json',
    );

    localStorage.setItem(
      'leerlingmemo_auth',
      'dit-is-geen-json',
    );

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: DataService,
          useValue: {
            stopListeners: vi.fn(),
          },
        },
      ],
    });

    const opnieuw = TestBed.inject(AuthService);

    expect(opnieuw.currentUser()).toBeNull();
    expect(sessionStorage.getItem('leerlingmemo_auth')).toBeNull();
    expect(localStorage.getItem('leerlingmemo_auth')).toBeNull();
  });

  it('staat standaard niet in sessieherstel', () => {
    expect(auth.herstelBezig()).toBe(false);
  });
});
