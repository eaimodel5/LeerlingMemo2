import { describe, it, expect } from 'vitest';
import { UserRole } from '../models/data.models';
import {
  RECHTEN,
  Recht,
  mag,
  isSuperuser,
  isCoordinatorOfHoger,
  isMentorOfHoger,
  isBekendeGebruiker,
} from './rechten';

const ROLLEN: UserRole[] = ['Docent', 'Mentor', 'Coordinator', 'Superuser'];

describe('rolvolgorde', () => {
  it('telt hoger op naarmate de rol hoger is', () => {
    expect(ROLLEN.filter(isBekendeGebruiker)).toEqual(['Docent', 'Mentor', 'Coordinator', 'Superuser']);
    expect(ROLLEN.filter(isMentorOfHoger)).toEqual(['Mentor', 'Coordinator', 'Superuser']);
    expect(ROLLEN.filter(isCoordinatorOfHoger)).toEqual(['Coordinator', 'Superuser']);
    expect(ROLLEN.filter(isSuperuser)).toEqual(['Superuser']);
  });

  it('geeft niemand iets zonder rol', () => {
    for (const recht of Object.keys(RECHTEN) as Recht[]) {
      expect(mag(null, recht)).toBe(false);
      expect(mag(undefined, recht)).toBe(false);
    }
  });
});

describe('rechten, gelijk aan firestore.rules', () => {
  // Deze tabel is de spiegel van firestore.rules. Loopt er iets uit de pas, dan
  // is dat precies het probleem dat deze module moet voorkomen: een knop die
  // zichtbaar is maar door de database wordt geweigerd.
  const verwacht: Record<Recht, UserRole[]> = {
    memoInvullen: ['Docent', 'Mentor', 'Coordinator', 'Superuser'],
    memoVerwijderen: ['Mentor', 'Coordinator', 'Superuser'],
    voorbereidingBewerken: ['Mentor', 'Coordinator', 'Superuser'],
    klasVergrendelen: ['Mentor', 'Coordinator', 'Superuser'],
    leerlingenBewerken: ['Mentor', 'Coordinator', 'Superuser'],
    leerlingenVerwijderen: ['Coordinator', 'Superuser'],
    docentkoppelingBewerken: ['Mentor', 'Coordinator', 'Superuser'],
    docentenlijstWissen: ['Coordinator', 'Superuser'],
    systeembeheer: ['Superuser'],
  };

  for (const [recht, toegestaan] of Object.entries(verwacht) as [Recht, UserRole[]][]) {
    it(`${recht}: ${toegestaan.join(', ')}`, () => {
      expect(ROLLEN.filter(rol => mag(rol, recht))).toEqual(toegestaan);
    });
  }

  it('dekt elk gedefinieerd recht af', () => {
    expect(Object.keys(verwacht).sort()).toEqual(Object.keys(RECHTEN).sort());
  });
});

describe('de gevallen die eerder misgingen', () => {
  it('een vakdocent komt niet bij de mentorschermen', () => {
    // /mentor-prep en /magister-export stonden op authGuard, die alleen kijkt
    // of je bent ingelogd. Een docent kon ze via de URL openen en las daar de
    // memo's van de hele school.
    expect(mag('Docent', 'voorbereidingBewerken')).toBe(false);
  });

  it('een mentor mag een docentmemo verwijderen', () => {
    // De prullenbak in het memopaneel was zichtbaar voor de mentor, maar de
    // regel stond op Coordinator: klikken gaf een foutmelding.
    expect(mag('Mentor', 'memoVerwijderen')).toBe(true);
  });

  it('een mentor mag een klas sluiten', () => {
    expect(mag('Mentor', 'klasVergrendelen')).toBe(true);
  });

  it('een mentor mag leerlingen bewerken maar niet de lijst wissen', () => {
    expect(mag('Mentor', 'leerlingenBewerken')).toBe(true);
    expect(mag('Mentor', 'leerlingenVerwijderen')).toBe(false);
    expect(mag('Coordinator', 'leerlingenVerwijderen')).toBe(true);
  });

  it('een coordinator wordt nergens uitgesloten door een controle op Mentor', () => {
    // hasRole() vergelijkt exact een rol; een controle op 'Mentor' sloot de
    // coordinator daarmee per ongeluk uit.
    for (const recht of Object.keys(RECHTEN) as Recht[]) {
      if (mag('Mentor', recht)) expect(mag('Coordinator', recht)).toBe(true);
    }
  });

  it('de superuser mag alles', () => {
    for (const recht of Object.keys(RECHTEN) as Recht[]) {
      expect(mag('Superuser', recht)).toBe(true);
    }
  });
});
