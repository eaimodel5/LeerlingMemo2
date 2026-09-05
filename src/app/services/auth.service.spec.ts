import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

const firebaseMock = vi.hoisted(() => ({
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  signInAnonymously: vi.fn(),
  sessieSet: vi.fn(),
  auth: {
    currentUser: { uid: 'uid-test' } as { uid: string } | null,
  },
}));

vi.mock('firebase/auth', () => ({
  signInAnonymously: firebaseMock.signInAnonymously,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn((_db: unknown, ...delen: string[]) => ({
    path: delen.join('/'),
  })),
  getDoc: firebaseMock.getDoc,
  setDoc: firebaseMock.setDoc,
  deleteDoc: firebaseMock.deleteDoc,
  onSnapshot: firebaseMock.onSnapshot,
}));

vi.mock('./firebase', () => ({
  auth: firebaseMock.auth,
  db: {},
  sessieActief: {
    set: firebaseMock.sessieSet,
  },
}));

import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { AccessCode } from '../models/data.models';

function snap(code: string, data: AccessCode) {
  return {
    id: code,
    exists: () => true,
    data: () => data,
  };
}

function maakCode(
  over: Partial<AccessCode> = {},
): AccessCode {
  return {
    code: 'ABCD-1234',
    role: 'Docent',
    ownerName: 'Hans Visser',
    ownerEmail: 'visser@school.nl',
    createdAt: '2026-09-05T12:00:00.000Z',
    active: true,
    used: false,
    ...over,
  };
}

describe('AuthService docentAfkorting', () => {
  let stopListeners: ReturnType<typeof vi.fn>;

  let snapshotMelding:
    | ((
        snapshot: {
          exists: () => boolean;
          data: () => AccessCode;
        },
      ) => void)
    | null;

  let snapshotFout:
    | ((error: unknown) => void)
    | null;

  beforeEach(() => {
    TestBed.resetTestingModule();

    sessionStorage.clear();
    localStorage.clear();

    firebaseMock.getDoc.mockReset();
    firebaseMock.setDoc.mockReset();
    firebaseMock.deleteDoc.mockReset();
    firebaseMock.onSnapshot.mockReset();
    firebaseMock.signInAnonymously.mockReset();
    firebaseMock.sessieSet.mockReset();

    firebaseMock.auth.currentUser = {
      uid: 'uid-test',
    };

    snapshotMelding = null;
    snapshotFout = null;

    firebaseMock.onSnapshot.mockImplementation(
      (
        _ref: unknown,
        next: typeof snapshotMelding,
        error: typeof snapshotFout,
      ) => {
        snapshotMelding = next;
        snapshotFout = error;

        return vi.fn();
      },
    );

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

    router.navigate = vi
      .fn()
      .mockResolvedValue(true);
  });

  it('neemt docentAfkorting uit de code over in AuthUser en userSession', async () => {
    const code = maakCode({
      docentAfkorting: 'vis',
    });

    firebaseMock.getDoc.mockResolvedValue(
      snap(code.code, code),
    );

    const auth = TestBed.inject(AuthService);

    const resultaat =
      await auth.loginWithCode(code.code);

    expect(resultaat).toEqual({
      ok: true,
    });

    expect(
      auth.currentUser()?.docentAfkorting,
    ).toBe('vis');

    expect(
      firebaseMock.setDoc,
    ).toHaveBeenCalledTimes(1);

    const sessie =
      firebaseMock.setDoc.mock.calls[0][1] as Record<
        string,
        unknown
      >;

    expect(
      sessie['docentAfkorting'],
    ).toBe('vis');

    expect(
      sessie['ownerEmail'],
    ).toBe('visser@school.nl');
  });

  it('laat een legacycode zonder docentAfkorting werken zonder een afkorting te verzinnen', async () => {
    const code = maakCode();

    delete code.docentAfkorting;

    firebaseMock.getDoc.mockResolvedValue(
      snap(code.code, code),
    );

    const auth = TestBed.inject(AuthService);

    const resultaat =
      await auth.loginWithCode(code.code);

    expect(resultaat).toEqual({
      ok: true,
    });

    expect(
      auth.currentUser()?.docentAfkorting,
    ).toBeUndefined();

    const sessie =
      firebaseMock.setDoc.mock.calls[0][1] as Record<
        string,
        unknown
      >;

    expect(
      Object.prototype.hasOwnProperty.call(
        sessie,
        'docentAfkorting',
      ),
    ).toBe(false);
  });

  it('herstelt docentAfkorting uit het codedocument en niet uit browseropslag', async () => {
    sessionStorage.setItem(
      'leerlingmemo_auth',
      JSON.stringify({
        name: 'Verkeerde browsernaam',
        email: 'oud@school.nl',
        role: 'Docent',
        code: 'ABCD-1234',
        docentAfkorting: 'jan',
      }),
    );

    const code = maakCode({
      docentAfkorting: 'vis',
    });

    firebaseMock.getDoc.mockResolvedValue(
      snap(code.code, code),
    );

    const auth = TestBed.inject(AuthService);

    await vi.waitFor(() => {
      expect(
        auth.currentUser()?.docentAfkorting,
      ).toBe('vis');
    });

    expect(
      auth.currentUser()?.name,
    ).toBe('Hans Visser');

    const sessie =
      firebaseMock.setDoc.mock.calls.at(-1)?.[1] as Record<
        string,
        unknown
      >;

    expect(
      sessie['docentAfkorting'],
    ).toBe('vis');
  });

  it('logt uit wanneer de bewaakte eigen code wordt ingetrokken', async () => {
    const code = maakCode({
      docentAfkorting: 'vis',
    });

    firebaseMock.getDoc.mockResolvedValue(
      snap(code.code, code),
    );

    const auth = TestBed.inject(AuthService);

    await auth.loginWithCode(code.code);

    expect(
      snapshotMelding,
    ).not.toBeNull();

    snapshotMelding?.({
      exists: () => true,
      data: () => ({
        ...code,
        active: false,
      }),
    });

    await vi.waitFor(() => {
      expect(
        auth.currentUser(),
      ).toBeNull();
    });

    expect(
      stopListeners,
    ).toHaveBeenCalled();

    expect(
      firebaseMock.deleteDoc,
    ).toHaveBeenCalled();
  });

  it('houdt de gebruiker ingelogd bij een fout van de codebewaking', async () => {
    const code = maakCode({
      docentAfkorting: 'vis',
    });

    firebaseMock.getDoc.mockResolvedValue(
      snap(code.code, code),
    );

    const auth = TestBed.inject(AuthService);

    await auth.loginWithCode(code.code);

    expect(
      snapshotFout,
    ).not.toBeNull();

    snapshotFout?.(
      new Error(
        'tijdelijke netwerkfout',
      ),
    );

    expect(
      auth.currentUser()?.docentAfkorting,
    ).toBe('vis');
  });
});
