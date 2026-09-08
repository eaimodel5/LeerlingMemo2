import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => ({
  browserSessionPersistence: {},
  inMemoryPersistence: {},
  initializeAuth: vi.fn(() => ({
    currentUser: { uid: 'uid-test' },
  })),
  signInAnonymously: vi.fn(async () => ({
    user: { uid: 'uid-test' },
  })),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn((_db: unknown, naam: string) => ({ path: naam })),
  doc: vi.fn((_db: unknown, ...delen: string[]) => ({ path: delen.join('/') })),
  query: vi.fn((ref: unknown) => ref),
  orderBy: vi.fn(() => ({})),
  setDoc: vi.fn(async () => undefined),
  deleteDoc: vi.fn(async () => undefined),
  getDoc: vi.fn(async () => ({ exists: () => false, data: () => undefined })),
  getDocs: vi.fn(async () => ({ docs: [] })),
  onSnapshot: vi.fn(() => vi.fn()),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(async () => undefined),
  })),
}));

import { ManageStudentsComponent } from './manage-students.component';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { NepDataService } from '../../testing/nep-dataservice';
import { Docent, Leerling } from '../models/data.models';

describe('ManageStudentsComponent mentor-koppelingen', () => {
  let data: NepDataService;
  let auth: {
    currentUser: ReturnType<typeof signal>;
    mag: ReturnType<typeof vi.fn>;
  };
  let component: ManageStudentsComponent;

  const docentenMock: Docent[] = [
    {
      afkorting: 'kar',
      naam: 'Rumeysa Karaarslan',
      actief: true,
    },
    {
      afkorting: 'bak',
      naam: 'Fatma Bakir',
      actief: true,
    },
    {
      afkorting: 'oud',
      naam: 'Oude Docent',
      actief: false,
    },
  ];

  beforeEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();

    data = new NepDataService();
    data.docenten.set(docentenMock);

    auth = {
      currentUser: signal({
        name: 'Coordinator',
        email: 'coord@school.nl',
        role: 'Coordinator',
      }),
      mag: vi.fn(() => true),
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

    component = TestBed.runInInjectionContext(() => new ManageStudentsComponent());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMentorStatus', () => {
    it('geeft "inOrde" als mentorAfkorting bekend en actief is', () => {
      const lln: Leerling = {
        id: 'lln-1',
        leerlingnummer: '1001',
        leerling: 'Pietje Puk',
        klas: '2A',
        mentorAfkorting: 'kar',
        mentorNaam: 'Rumeysa Karaarslan',
        mentorEmail: 'r.karaarslan@school.nl',
        schooljaar: '2026-2027',
        actief: true,
      };

      const status = component.getMentorStatus(lln);
      expect(status.soort).toBe('inOrde');
      expect(status.afkorting).toBe('kar');
      expect(status.docent?.naam).toBe('Rumeysa Karaarslan');
    });

    it('geeft "ontbreekt" als er wel een mentorNaam/Email is maar geen mentorAfkorting', () => {
      const lln: Leerling = {
        id: 'lln-2',
        leerlingnummer: '1002',
        leerling: 'Jan Klaassen',
        klas: '2A',
        mentorNaam: 'Fatma Bakir',
        mentorEmail: 'f.bakir@school.nl',
        schooljaar: '2026-2027',
        actief: true,
      };

      const status = component.getMentorStatus(lln);
      expect(status.soort).toBe('ontbreekt');
    });

    it('geeft "onbekend" als mentorAfkorting niet voorkomt in docentenbestand', () => {
      const lln: Leerling = {
        id: 'lln-3',
        leerlingnummer: '1003',
        leerling: 'Klaas Vaak',
        klas: '2B',
        mentorAfkorting: 'xyz',
        mentorNaam: 'Onbekende Mentor',
        mentorEmail: '',
        schooljaar: '2026-2027',
        actief: true,
      };

      const status = component.getMentorStatus(lln);
      expect(status.soort).toBe('onbekend');
      expect(status.afkorting).toBe('xyz');
    });

    it('geeft "geen" als de leerling geen enkele mentorrelatie heeft', () => {
      const lln: Leerling = {
        id: 'lln-4',
        leerlingnummer: '1004',
        leerling: 'Solo Leerling',
        klas: '3V',
        mentorNaam: '',
        mentorEmail: '',
        schooljaar: '2026-2027',
        actief: true,
      };

      const status = component.getMentorStatus(lln);
      expect(status.soort).toBe('geen');
    });
  });

  describe('mentorProblemen computed signal', () => {
    it('signaleert alleen leerlingen met ontbrekende of onbekende mentorAfkorting', () => {
      data.leerlingen.set([
        {
          id: 'lln-1',
          leerlingnummer: '1001',
          leerling: 'Goed Gekoppeld',
          klas: '2A',
          mentorAfkorting: 'kar',
          mentorNaam: 'Rumeysa Karaarslan',
          mentorEmail: '',
          schooljaar: '2026-2027',
          actief: true,
        },
        {
          id: 'lln-2',
          leerlingnummer: '1002',
          leerling: 'Mist Afkorting',
          klas: '2A',
          mentorNaam: 'Fatma Bakir',
          mentorEmail: 'f.bakir@school.nl',
          schooljaar: '2026-2027',
          actief: true,
        },
        {
          id: 'lln-3',
          leerlingnummer: '1003',
          leerling: 'Onbekende Code',
          klas: '2B',
          mentorAfkorting: 'onb',
          mentorNaam: 'Iemand',
          mentorEmail: '',
          schooljaar: '2026-2027',
          actief: true,
        },
        {
          id: 'lln-4',
          leerlingnummer: '1004',
          leerling: 'Zonder Mentor',
          klas: '2B',
          mentorNaam: '',
          mentorEmail: '',
          schooljaar: '2026-2027',
          actief: true,
        },
      ]);

      const problemen = component.mentorProblemen();
      expect(problemen.length).toBe(2);
      expect(problemen.map(p => p.leerlingnummer).sort()).toEqual(['1002', '1003']);
    });
  });

  describe('Snelle Reparatie Modal (openRepairMentor, saveRepairMentor)', () => {
    it('koppelt een canonieke docent succesvol aan de leerling', async () => {
      const student: Leerling = {
        id: 'lln-test',
        leerlingnummer: '1002',
        leerling: 'Jan Klaassen',
        klas: '2A',
        mentorNaam: 'Fatma Bakir',
        mentorEmail: 'fbakir@school.nl',
        schooljaar: '2026-2027',
        actief: true,
      };
      data.leerlingen.set([student]);

      component.openRepairMentor(student);
      expect(component.repairingStudent()).toBe(student);

      component.selectedRepairMentorAfkorting.set('bak');
      await component.saveRepairMentor();

      const opgeslagen = data.leerlingen().find(l => l.id === 'lln-test');
      expect(opgeslagen?.mentorAfkorting).toBe('bak');
      expect(opgeslagen?.mentorNaam).toBe('Fatma Bakir');
      expect(component.repairingStudent()).toBeNull();
    });

    it('weigert onbekende docentafkorting', async () => {
      const student: Leerling = {
        id: 'lln-test',
        leerlingnummer: '1002',
        leerling: 'Jan Klaassen',
        klas: '2A',
        mentorNaam: 'Onbekend',
        mentorEmail: '',
        schooljaar: '2026-2027',
        actief: true,
      };
      data.leerlingen.set([student]);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      component.openRepairMentor(student);
      component.selectedRepairMentorAfkorting.set('xyz');
      await component.saveRepairMentor();

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Onbekende afkorting geweigerd')
      );
      const ongewijzigd = data.leerlingen().find(l => l.id === 'lln-test');
      expect(ongewijzigd?.mentorAfkorting).toBeUndefined();
    });

    it('weigert inactieve docentafkorting', async () => {
      const student: Leerling = {
        id: 'lln-test',
        leerlingnummer: '1002',
        leerling: 'Jan Klaassen',
        klas: '2A',
        mentorNaam: 'Oude Docent',
        mentorEmail: '',
        schooljaar: '2026-2027',
        actief: true,
      };
      data.leerlingen.set([student]);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      component.openRepairMentor(student);
      component.selectedRepairMentorAfkorting.set('oud');
      await component.saveRepairMentor();

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('is inactief')
      );
    });
  });

  describe('Formulier opslaan (onSubmit)', () => {
    it('synchroniseert canonieke naam bij selecteren van docentafkorting', () => {
      component.openForm();
      component.form.patchValue({
        leerlingnummer: '1099',
        leerling: 'Nieuwe Leerling',
        klas: '1A',
        mentorAfkorting: 'kar',
      });

      component.onSubmit();

      const nieuw = data.leerlingen().find(l => l.leerlingnummer === '1099');
      expect(nieuw).toBeDefined();
      expect(nieuw?.mentorAfkorting).toBe('kar');
      expect(nieuw?.mentorNaam).toBe('Rumeysa Karaarslan');
    });

        it('slaat nooit alleen een naam en e-mailadres op zonder geldige afkorting', () => {
      component.openForm();
      component.form.patchValue({
        leerlingnummer: '1100',
        leerling: 'Test Leerling',
        klas: '1A',
        mentorAfkorting: '',
      });
      // Component doesn't allow form editing of mentorNaam/mentorEmail directly,
      // but let's simulate form having no afkorting.
      component.onSubmit();
      const nieuw = data.leerlingen().find(l => l.leerlingnummer === '1100');
      expect(nieuw).toBeDefined();
      expect(nieuw?.mentorAfkorting).toBeFalsy();
      expect(nieuw?.mentorNaam).toBeFalsy();
      expect(nieuw?.mentorEmail).toBeFalsy();
    });

    it('weigert onbekende afkorting bij handmatig opslaan', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      component.openForm();
      component.form.patchValue({
        leerlingnummer: '1099',
        leerling: 'Nieuwe Leerling',
        klas: '1A',
        mentorAfkorting: 'unknown',
      });

      component.onSubmit();

      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Onbekende afkorting geweigerd')
      );
      expect(data.leerlingen().length).toBe(0);
    });
  });
});
