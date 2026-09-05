import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

/**
 * Angular 21 ondersteunt vi.mock niet voor relatieve imports.
 *
 * Daarom mocken we hier alleen externe Firebase-pakketten.
 * DataService en AuthService worden verderop via Angular TestBed vervangen.
 */
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  browserSessionPersistence: {},
  inMemoryPersistence: {},
  initializeAuth: vi.fn(() => ({
    currentUser: {
      uid: 'uid-test',
    },
  })),
  signInAnonymously: vi.fn(async () => ({
    user: {
      uid: 'uid-test',
    },
  })),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),

  collection: vi.fn(
    (_db: unknown, naam: string) => ({
      path: naam,
    }),
  ),

  doc: vi.fn(
    (_db: unknown, ...delen: string[]) => ({
      path: delen.join('/'),
    }),
  ),

  query: vi.fn((ref: unknown) => ref),

  orderBy: vi.fn(() => ({})),

  setDoc: vi.fn(async () => undefined),

  deleteDoc: vi.fn(async () => undefined),

  getDoc: vi.fn(async () => ({
    exists: () => false,
    data: () => undefined,
  })),

  getDocs: vi.fn(async () => ({
    docs: [],
  })),

  onSnapshot: vi.fn(() => vi.fn()),

  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(async () => undefined),
  })),
}));

import { setDoc } from 'firebase/firestore';

import { SuperuserComponent } from './superuser.component';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { NepDataService } from '../../testing/nep-dataservice';
import { AccessCode } from '../models/data.models';

function code(over: Partial<AccessCode> = {}): AccessCode {
  return {
    id: 'SU-0001',
    code: 'SU-0001',
    role: 'Superuser',
    ownerName: 'Hans Visser',
    ownerEmail: 'visser@school.nl',
    docentAfkorting: 'vis',
    createdAt: '2026-09-05T12:00:00.000Z',
    active: true,
    used: false,
    ...over,
  };
}

describe('SuperuserComponent toegangscodes', () => {
  let data: NepDataService;

  let auth: {
    currentUser: ReturnType<typeof signal>;
    logout: ReturnType<typeof vi.fn>;
  };

  let component: SuperuserComponent;

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    data = new NepDataService();

    auth = {
      currentUser: signal({
        name: 'Hans Visser',
        email: 'visser@school.nl',
        role: 'Superuser',
        code: 'SU-0001',
        docentAfkorting: 'vis',
      }),

      logout: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataService,
          useValue: data as unknown as DataService,
        },
        {
          provide: AuthService,
          useValue: auth as unknown as AuthService,
        },
      ],
    });

    component = TestBed.runInInjectionContext(
      () => new SuperuserComponent(),
    );
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it(
    'maakt een nieuwe code alleen voor een expliciet gekozen actieve docent',
    async () => {
      data.docenten.set([
        {
          afkorting: 'vis',
          naam: 'Hans Visser',
          actief: true,
        },
      ]);

      component.newCodeRole.set('Docent');
      component.newCodeAfkorting.set('VIS');
      component.newCodeName.set('Piet Jansen');
      component.newCodeEmail.set('legacy@school.nl');
      component.newCodeVak.set('Wiskunde');

      expect(component.isValid()).toBe(true);

      await component.createCode();

      expect(
        vi.mocked(setDoc),
      ).toHaveBeenCalledTimes(1);

      const opgeslagen = vi.mocked(setDoc).mock.calls[0][1] as unknown as AccessCode;

      expect(
        opgeslagen.docentAfkorting,
      ).toBe('vis');

      expect(
        opgeslagen.ownerName,
      ).toBe('Hans Visser');

      expect(
        opgeslagen.ownerEmail,
      ).toBe('legacy@school.nl');

      expect(
        opgeslagen.role,
      ).toBe('Docent');

      expect(
        opgeslagen.vak,
      ).toBe('Wiskunde');
    },
  );

  it(
    'weigert een nieuwe code voor een inactieve docent',
    async () => {
      data.docenten.set([
        {
          afkorting: 'vis',
          naam: 'Hans Visser',
          actief: false,
        },
      ]);

      component.newCodeRole.set('Mentor');
      component.newCodeAfkorting.set('vis');
      component.newCodeName.set('Hans Visser');
      component.newCodeEmail.set('legacy@school.nl');

      expect(
        component.isValid(),
      ).toBe(false);

      await component.createCode();

      expect(
        vi.mocked(setDoc),
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'accepteert in CSV alleen een bekende actieve docentAfkorting en gebruikt diens naam',
    async () => {
      data.docenten.set([
        {
          afkorting: 'vis',
          naam: 'Hans Visser',
          actief: true,
        },
      ]);

      const bestand = new File(
        [
          'Afkorting;Email;Rol;Vak\n' +
          'VIS;legacy@school.nl;Docent;Wiskunde\n',
        ],
        'codes.csv',
        {
          type: 'text/csv',
        },
      );

      const target = {
        files: [bestand],
        value: 'codes.csv',
      };

      component.onFileSelected({
        target,
      } as unknown as Event);

      await vi.waitFor(() => {
        expect(
          component.csvPreviewData(),
        ).not.toBeNull();
      });

      const rij =
        component.csvPreviewData()?.[0];

      expect(
        rij?.docentAfkorting,
      ).toBe('vis');

      expect(
        rij?.ownerName,
      ).toBe('Hans Visser');

      expect(
        rij?.ownerEmail,
      ).toBe('legacy@school.nl');
    },
  );

  it(
    'wijst een onbekende docentAfkorting in CSV af',
    async () => {
      data.docenten.set([
        {
          afkorting: 'vis',
          naam: 'Hans Visser',
          actief: true,
        },
      ]);

      const bestand = new File(
        [
          'Afkorting;Email;Rol;Vak\n' +
          'xyz;legacy@school.nl;Mentor;\n',
        ],
        'codes.csv',
        {
          type: 'text/csv',
        },
      );

      const target = {
        files: [bestand],
        value: 'codes.csv',
      };

      component.onFileSelected({
        target,
      } as unknown as Event);

      await vi.waitFor(() => {
        expect(
          component.melding()?.tekst,
        ).toContain('niet gevonden');
      });

      expect(
        component.csvPreviewData(),
      ).toBeNull();
    },
  );

  it(
    'beschermt de laatste actieve Superuser-code',
    () => {
      const enige = code();

      component.codes.set([
        enige,
      ]);

      expect(
        component.bezwaarIntrekken(enige),
      ).not.toBeNull();

      const tweede = code({
        id: 'SU-0002',
        code: 'SU-0002',
        docentAfkorting: 'jan',
        ownerName: 'Jan Jansen',
        ownerEmail: 'jan@school.nl',
      });

      component.codes.set([
        enige,
        tweede,
      ]);

      expect(
        component.bezwaarIntrekken(enige),
      ).toBeNull();
    },
  );
});
