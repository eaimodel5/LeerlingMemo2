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

  describe('Legacy toegangscodes herstelroute', () => {
    it('detecteert actieve docent/mentor codes zonder afkorting of met onbekende afkorting', () => {
      data.docenten.set([
        { afkorting: 'vis', naam: 'Hans Visser', actief: true },
        { afkorting: 'bak', naam: 'Els Bakker', actief: true },
      ]);

      const legacyDocentCode: AccessCode = {
        id: 'DOC-01',
        code: 'DOC-01',
        role: 'Docent',
        ownerName: 'Oude Docent',
        ownerEmail: 'doc@school.nl',
        createdAt: '2026-09-01T00:00:00Z',
        active: true,
        used: false,
      };

      const onbekendeMentorCode: AccessCode = {
        id: 'MEN-01',
        code: 'MEN-01',
        role: 'Mentor',
        ownerName: 'Onbekende Mentor',
        ownerEmail: 'men@school.nl',
        docentAfkorting: 'onb',
        createdAt: '2026-09-01T00:00:00Z',
        active: true,
        used: false,
      };

      const geldigeCode: AccessCode = {
        id: 'DOC-02',
        code: 'DOC-02',
        role: 'Docent',
        ownerName: 'Hans Visser',
        ownerEmail: 'vis@school.nl',
        docentAfkorting: 'vis',
        createdAt: '2026-09-01T00:00:00Z',
        active: true,
        used: false,
      };

      component.codes.set([legacyDocentCode, onbekendeMentorCode, geldigeCode]);

      const rapport = component.migratieStatus();
      expect(rapport.problemen).toBe(2);
      expect(rapport.zonderAfkorting).toBe(1);
      expect(rapport.onbekendeAfkorting).toBe(1);
      expect(rapport.probleemGevallen.length).toBe(2);

      // Filteren op te herstellen codes
      component.alleenHerstelNodig.set(true);
      const gefilterd = component.filteredCodes();
      expect(gefilterd.length).toBe(2);
      expect(gefilterd.map(c => c.id)).toEqual(['DOC-01', 'MEN-01']);
    });

    it('koppelt een legacy code succesvol aan een expliciet gekozen docent via saveRepairedCode', async () => {
      data.docenten.set([
        { afkorting: 'bak', naam: 'Els Bakker', actief: true },
      ]);

      const legacyCode: AccessCode = {
        id: 'DOC-LEGACY',
        code: 'DOC-LEGACY',
        role: 'Docent',
        ownerName: 'Oude Onbekende Naam',
        ownerEmail: 'onbekend@school.nl',
        createdAt: '2026-09-01T00:00:00Z',
        active: true,
        used: false,
      };

      component.codes.set([legacyCode]);

      // Open repair modal
      component.openRepairModal(legacyCode);
      expect(component.repairCode()).toBe(legacyCode);

      // Selecteer canonieke docent 'bak'
      component.repairDocentAfkorting.set('BAK');

      await component.saveRepairedCode();

      expect(vi.mocked(setDoc)).toHaveBeenCalledTimes(1);
      const call = vi.mocked(setDoc).mock.calls[0];
      expect(call[1]).toEqual({
        docentAfkorting: 'bak',
        ownerName: 'Els Bakker',
      });

      // Modal gesloten en melding gegeven
      expect(component.repairCode()).toBeNull();
      expect(component.melding()?.soort).toBe('ok');
      expect(component.melding()?.tekst).toContain('succesvol gekoppeld aan docent Els Bakker (BAK)');

      // Lokale code is gemuteerd
      const bijgewerkt = component.codes().find(c => c.id === 'DOC-LEGACY');
      expect(bijgewerkt?.docentAfkorting).toBe('bak');
      expect(bijgewerkt?.ownerName).toBe('Els Bakker');
      expect(component.migratieStatus().problemen).toBe(0);
    });

    it('weigert koppeling bij ongeldige of onbekende afkorting', async () => {
      data.docenten.set([
        { afkorting: 'bak', naam: 'Els Bakker', actief: true },
      ]);

      const legacyCode: AccessCode = {
        id: 'DOC-LEGACY',
        code: 'DOC-LEGACY',
        role: 'Docent',
        ownerName: 'Oude Naam',
        ownerEmail: 'onbekend@school.nl',
        createdAt: '2026-09-01T00:00:00Z',
        active: true,
        used: false,
      };

      component.codes.set([legacyCode]);
      component.openRepairModal(legacyCode);

      // Onbekende afkorting
      component.repairDocentAfkorting.set('xyz');
      await component.saveRepairedCode();

      expect(vi.mocked(setDoc)).not.toHaveBeenCalled();
      expect(component.melding()?.soort).toBe('fout');
      expect(component.melding()?.tekst).toContain('niet gevonden');
    });

    it('weigert koppeling aan een inactieve docent', async () => {
      data.docenten.set([
        { afkorting: 'ina', naam: 'Inactieve Docent', actief: false },
      ]);

      const legacyCode: AccessCode = {
        id: 'DOC-LEGACY',
        code: 'DOC-LEGACY',
        role: 'Docent',
        ownerName: 'Oude Naam',
        ownerEmail: 'onbekend@school.nl',
        createdAt: '2026-09-01T00:00:00Z',
        active: true,
        used: false,
      };

      component.codes.set([legacyCode]);
      component.openRepairModal(legacyCode);

      component.repairDocentAfkorting.set('ina');
      await component.saveRepairedCode();

      expect(vi.mocked(setDoc)).not.toHaveBeenCalled();
      expect(component.melding()?.soort).toBe('fout');
      expect(component.melding()?.tekst).toContain('is inactief');
    });
  });
});
