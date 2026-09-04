import {
  AccessCode,
  ClassLock,
  Docent,
  DocentTaak,
  DocentVak,
  Leerling,
  MemoTW1TW2,
  MemoTW3,
  MentorVoorbereiding,
  UserRole,
  Voortgangsplan,
} from '../app/models/data.models';

/**
 * Bouwstenen voor tests.
 *
 * Elke test die een leerling, een memo of een taak nodig heeft, moest die tot
 * nu toe zelf helemaal uitschrijven — veertien velden voor één memo. Dat maakt
 * tests lang en verbergt waar het in die test werkelijk om gaat. Hieronder
 * staat per soort één functie met werkende standaardwaarden; een test noemt
 * alleen wat voor die test uitmaakt.
 *
 * De standaardwaarden vormen samen één samenhangend geval: leerling 123456 in
 * klas H4A, mentor Marieke Mentor, vakdocent Hans Visser voor Wiskunde.
 */

export const SCHOOLJAAR = '2026-2027';
export const PERIODES = ['TW1', 'TW2', 'TW3'] as const;
export type Periode = (typeof PERIODES)[number];

export const LEERLINGNUMMER = '123456';
export const KLAS = 'H4A';
export const VAK = 'Wiskunde';

export const DOCENT = { naam: 'Hans Visser', email: 'visser@school.nl' };
export const DOCENT2 = { naam: 'Jansen', email: 'jansen@school.nl' };
export const MENTOR = { naam: 'Marieke Mentor', email: 'mentor@school.nl' };

const NU = '2026-09-01T10:00:00.000Z';

export function maakLeerling(over: Partial<Leerling> = {}): Leerling {
  return {
    id: 'leerling-1',
    leerlingnummer: LEERLINGNUMMER,
    leerling: 'Sam de Vries',
    klas: KLAS,
    mentorNaam: MENTOR.naam,
    mentorEmail: MENTOR.email,
    schooljaar: SCHOOLJAAR,
    actief: true,
    ...over,
  };
}

export function maakDocent(over: Partial<Docent> = {}): Docent {
  return {
    afkorting: 'vis',
    naam: DOCENT.naam,
    email: DOCENT.email,
    actief: true,
    aangemaaktOp: NU,
    gewijzigdOp: NU,
    ...over,
  };
}

export function maakDocentVak(over: Partial<DocentVak> = {}): DocentVak {
  return {
    id: 'docentvak-1',
    docentNaam: DOCENT.naam,
    docentEmail: DOCENT.email,
    vak: VAK,
    klas: KLAS,
    schooljaar: SCHOOLJAAR,
    actief: true,
    ...over,
  };
}

const AANDACHT_UIT = {
  aandachtInhoudelijkBegrip: false,
  aandachtPlanningOrganisatie: false,
  aandachtToetsvoorbereidingLeerstrategie: false,
  aandachtInzetWerkhouding: false,
  aandachtWerkNietOpOrde: false,
  aandachtAanwezigheidVerzuim: false,
};

export function maakMemoTW12(over: Partial<MemoTW1TW2> = {}): MemoTW1TW2 {
  return {
    id: 'memo-1',
    schooljaar: SCHOOLJAAR,
    toetsweek: 'TW1',
    leerlingnummer: LEERLINGNUMMER,
    leerling: 'Sam de Vries',
    klas: KLAS,
    docentNaam: DOCENT.naam,
    docentEmail: DOCENT.email,
    vak: VAK,
    ...AANDACHT_UIT,
    waarZieJeDitAan: 'Levert het huiswerk vaak te laat in.',
    watWerktWel: 'Vragen stellen in de les gaat goed.',
    leerlingActie: 'Plant huiswerk in de agenda.',
    emc: 'Nee',
    docentActie: 'Wekelijks kort navragen.',
    status: 'Definitief',
    aangemaaktDoor: DOCENT.email,
    aangemaaktOp: NU,
    gewijzigdOp: NU,
    ...over,
  };
}

export function maakMemoTW3(over: Partial<MemoTW3> = {}): MemoTW3 {
  return {
    id: 'memo3-1',
    schooljaar: SCHOOLJAAR,
    toetsweek: 'TW3',
    leerlingnummer: LEERLINGNUMMER,
    leerling: 'Sam de Vries',
    klas: KLAS,
    docentNaam: DOCENT.naam,
    docentEmail: DOCENT.email,
    vak: VAK,
    ...AANDACHT_UIT,
    waarZieJeDitAan: 'Cijfers lopen terug in het tweede deel van het jaar.',
    watWerktWel: 'Werkt goed samen in groepjes.',
    doorstroomToelichting: 'Bevordering is haalbaar met inzet op planning.',
    status: 'Definitief',
    aangemaaktDoor: DOCENT.email,
    aangemaaktOp: NU,
    gewijzigdOp: NU,
    ...over,
  };
}

export function maakVoorbereiding(over: Partial<MentorVoorbereiding> = {}): MentorVoorbereiding {
  return {
    id: 'prep-1',
    schooljaar: SCHOOLJAAR,
    periode: 'TW1',
    leerlingnummer: LEERLINGNUMMER,
    leerling: 'Sam de Vries',
    klas: KLAS,
    mentorNaam: MENTOR.naam,
    mentorEmail: MENTOR.email,
    overzichtResultaten: 'Voldoende, met uitschieters naar beneden bij de talen.',
    belangrijksteSignalenUitMemos: 'Planning en huiswerk.',
    aandachtspuntenPersoonlijkeAchtergrond: '',
    centraleBespreekvragen: 'Hoe krijgen we de planning op orde?',
    status: 'Concept',
    aangemaaktDoor: MENTOR.email,
    aangemaaktOp: NU,
    gewijzigdOp: NU,
    ...over,
  };
}

export function maakVoortgangsplan(over: Partial<Voortgangsplan> = {}): Voortgangsplan {
  return {
    id: 'plan-1',
    schooljaar: SCHOOLJAAR,
    periode: 'TW1',
    leerlingnummer: LEERLINGNUMMER,
    leerling: 'Sam de Vries',
    klas: KLAS,
    mentorNaam: MENTOR.naam,
    mentorEmail: MENTOR.email,
    gezamenlijkeConclusie: 'Planning is het grootste knelpunt.',
    afspraakLeerling1: 'Maakt elke dag een dagplanning.',
    afspraakLeerling2: '',
    afspraakLeerling3: '',
    afspraakDocenten1: 'Wiskunde controleert wekelijks.',
    afspraakDocenten2: '',
    afspraakDocenten3: '',
    evaluatieWanneer: 'Over zes weken',
    evaluatieDoorWie: MENTOR.naam,
    terugkoppelingOuders: 'Besproken in het oudergesprek.',
    status: 'Concept',
    aangemaaktDoor: MENTOR.email,
    aangemaaktOp: NU,
    gewijzigdOp: NU,
    ...over,
  };
}

export function maakTaak(over: Partial<DocentTaak> = {}): DocentTaak {
  return {
    id: 'taak-1',
    schooljaar: SCHOOLJAAR,
    periode: 'TW1',
    klas: KLAS,
    leerlingnummer: LEERLINGNUMMER,
    leerling: 'Sam de Vries',
    docentEmail: DOCENT.email,
    docentNaam: DOCENT.naam,
    vak: VAK,
    mentorEmail: MENTOR.email,
    status: 'Open',
    aangemaaktOp: NU,
    gewijzigdOp: NU,
    ...over,
  };
}

export function maakLock(over: Partial<ClassLock> = {}): ClassLock {
  return {
    id: `${KLAS}_TW1_${SCHOOLJAAR}`,
    klas: KLAS,
    periode: 'TW1',
    schooljaar: SCHOOLJAAR,
    isLocked: true,
    lockedBy: MENTOR.email,
    lockedAt: NU,
    ...over,
  };
}

export function maakCode(over: Partial<AccessCode> = {}): AccessCode {
  return {
    id: 'AAAA-BBBB',
    code: 'AAAA-BBBB',
    role: 'Docent',
    ownerName: DOCENT.naam,
    ownerEmail: DOCENT.email,
    createdAt: NU,
    active: true,
    used: false,
    ...over,
  };
}

/** De ingelogde gebruiker zoals AuthService hem bijhoudt. */
export function maakGebruiker(rol: UserRole, over: Partial<{ name: string; email: string; vak: string }> = {}) {
  const standaard =
    rol === 'Docent'
      ? { name: DOCENT.naam, email: DOCENT.email }
      : { name: MENTOR.naam, email: MENTOR.email };
  return {
    name: standaard.name,
    email: standaard.email,
    role: rol,
    code: 'AAAA-BBBB',
    ...over,
  };
}
