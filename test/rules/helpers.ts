import { readFileSync } from 'node:fs';
import { RulesTestEnvironment, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { Firestore, deleteField, doc, setDoc } from 'firebase/firestore';

/**
 * De beveiligingsregels testen tegen een echte Firestore-emulator.
 *
 * De tests in `src/` bewaken de TypeScript-kant: wat de schermen tonen en welke
 * knoppen verschijnen. Dat zegt niets over wat de database toestaat. Precies
 * dat verschil was de storing waar deze reeks mee begon -- de schermen deden
 * hun werk, en de regels weigerden.
 *
 * De regels worden hier uit `firestore.rules` gelezen en aan de emulator
 * gegeven. Ze komen dus niet uit `firebase.json`: dat bestand wijst naar de
 * named database van de school, en de emulator draait op de standaarddatabase.
 * Zo test je altijd het bestand dat je ook publiceert.
 */

export const SCHOOLJAAR = '2026-2027';

export async function maakOmgeving(): Promise<RulesTestEnvironment> {
  const gastheer = process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080';
  const [host, poort] = gastheer.split(':');
  return initializeTestEnvironment({
    projectId: 'demo-leerlingmemo',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host,
      port: Number(poort),
    },
  });
}

export type Rol = 'Docent' | 'Mentor' | 'Coordinator' | 'Superuser';

/** Een toegangscode zoals het beheerscherm hem wegschrijft. */
export function codeDoc(over: Record<string, unknown> = {}) {
  return {
    code: 'AAAA-BBBB',
    role: 'Docent',
    ownerName: 'Hans Visser',
    ownerEmail: 'visser@school.nl',
    createdAt: '2026-09-01T10:00:00.000Z',
    active: true,
    used: false,
    ...over,
  };
}

/** Een sessiedocument zoals AuthService het wegschrijft na inloggen. */
export function sessieDoc(over: Record<string, unknown> = {}) {
  return {
    code: 'AAAA-BBBB',
    role: 'Docent',
    ownerName: 'Hans Visser',
    ownerEmail: 'visser@school.nl',
    startedAt: '2026-09-01T10:00:00.000Z',
    ...over,
  };
}

export function memoDoc(over: Record<string, unknown> = {}) {
  return {
    schooljaar: SCHOOLJAAR,
    toetsweek: 'TW1',
    leerlingnummer: '123456',
    leerling: 'Sam de Vries',
    klas: 'H4A',
    docentNaam: 'Hans Visser',
    docentEmail: 'visser@school.nl',
    vak: 'Wiskunde',
    waarZieJeDitAan: 'Levert werk te laat in.',
    watWerktWel: '',
    leerlingActie: 'Agenda gebruiken.',
    emc: 'Nee',
    docentActie: 'Navragen.',
    status: 'Definitief',
    aangemaaktDoor: 'visser@school.nl',
    aangemaaktOp: '2026-09-01T10:00:00.000Z',
    gewijzigdOp: '2026-09-01T10:00:00.000Z',
    ...over,
  };
}

export function leerlingDoc(over: Record<string, unknown> = {}) {
  return {
    leerlingnummer: '123456',
    leerling: 'Sam de Vries',
    klas: 'H4A',
    mentorNaam: 'Marieke Mentor',
    mentorEmail: 'mentor@school.nl',
    schooljaar: SCHOOLJAAR,
    actief: true,
    ...over,
  };
}

export interface Inlog {
  uid?: string;
  rol?: Rol;
  code?: string;
  /** Zet de code op ingetrokken (`active: false`). */
  ingetrokken?: boolean;
  /** Laat `active` helemaal weg, zoals bij codes van voor die wijziging. */
  zonderActiefVeld?: boolean;
  /** Schrijf geen code-document, alsof de beheerder de code heeft verwijderd. */
  zonderCode?: boolean;
  /** Zet in de sessie een andere rol dan in de code staat. */
  sessieRol?: Rol;
  /** Laat het veld `code` weg uit de sessie. */
  sessieZonderCode?: boolean;
}

/**
 * Zet een ingelogde gebruiker klaar: een code in /codes en een sessie in
 * /userSessions, precies zoals de app ze schrijft.
 *
 * Geeft de Firestore terug waarmee die gebruiker werkt.
 */
export async function alsGebruiker(omgeving: RulesTestEnvironment, opties: Inlog = {}): Promise<Firestore> {
  const uid = opties.uid ?? 'gebruiker-1';
  const rol = opties.rol ?? 'Docent';
  const codeId = opties.code ?? 'AAAA-BBBB';

  await omgeving.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    if (!opties.zonderCode) {
      const code: Record<string, unknown> = codeDoc({ code: codeId, role: rol });
      if (opties.zonderActiefVeld) delete code['active'];
      else code['active'] = !opties.ingetrokken;
      await setDoc(doc(db, 'codes', codeId), code);
    }
    const sessie: Record<string, unknown> = sessieDoc({ code: codeId, role: opties.sessieRol ?? rol });
    if (opties.sessieZonderCode) delete sessie['code'];
    await setDoc(doc(db, 'userSessions', uid), sessie);
  });

  return omgeving.authenticatedContext(uid).firestore() as unknown as Firestore;
}

/**
 * Iemand die zich anoniem heeft aangemeld maar nog geen sessie heeft.
 *
 * Dat is de toestand tussen `signInAnonymously()` en het schrijven van
 * /userSessions: precies het moment waarop de inlogpagina de code opvraagt.
 */
export function alsAangemeld(omgeving: RulesTestEnvironment, uid = 'nieuw'): Firestore {
  return omgeving.authenticatedContext(uid).firestore() as unknown as Firestore;
}

/** Een bezoeker die zich niet heeft aangemeld bij Firebase. */
export function alsOnbekende(omgeving: RulesTestEnvironment): Firestore {
  return omgeving.unauthenticatedContext().firestore() as unknown as Firestore;
}

/** Zet gegevens klaar zonder dat de regels meekijken. */
export async function seed(omgeving: RulesTestEnvironment, pad: string, data: Record<string, unknown>) {
  await omgeving.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), pad), data);
  });
}

/** Trekt een bestaande code in, alsof de beheerder op Intrekken drukt. */
export async function trekCodeIn(omgeving: RulesTestEnvironment, codeId = 'AAAA-BBBB') {
  await omgeving.withSecurityRulesDisabled(async ctx => {
    await setDoc(
      doc(ctx.firestore(), 'codes', codeId),
      { active: false, gewijzigdOp: new Date().toISOString() },
      { merge: true },
    );
  });
}

/** Haalt het veld `active` weg, zoals bij codes van voor die wijziging. */
export async function verwijderActiefVeld(omgeving: RulesTestEnvironment, codeId = 'AAAA-BBBB') {
  await omgeving.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'codes', codeId), { active: deleteField() }, { merge: true });
  });
}
