import { UserRole } from '../models/data.models';

/**
 * Wie wat mag — op één plek, gelijk aan `firestore.rules`.
 *
 * Stond hiervoor verspreid: guards in de routetabel, `hasRole(...)` in de
 * sjablonen, en de echte controle in de beveiligingsregels. Die drie liepen uit
 * elkaar. Het gevolg was twee soorten fouten die allebei lastig te herkennen
 * zijn: een knop die zichtbaar is maar bij het indrukken door de database wordt
 * geweigerd, en een scherm dat verborgen is in het menu maar via de URL gewoon
 * opengaat.
 *
 * De regels kennen geen rolvolgorde — daar staat per collectie een expliciete
 * lijst. Hieronder staat diezelfde volgorde één keer, en elk recht verwijst
 * ernaar. Wijzigt er iets, dan wijzigt het hier én in `firestore.rules`.
 */
export type Rol = UserRole | null | undefined;

export function isSuperuser(rol: Rol): boolean {
  return rol === 'Superuser';
}

export function isCoordinatorOfHoger(rol: Rol): boolean {
  return rol === 'Coordinator' || isSuperuser(rol);
}

export function isMentorOfHoger(rol: Rol): boolean {
  return rol === 'Mentor' || isCoordinatorOfHoger(rol);
}

/** Elke rol die een geldige toegangscode heeft. Gelijk aan `isAuthorizedUser()`. */
export function isBekendeGebruiker(rol: Rol): boolean {
  return rol === 'Docent' || isMentorOfHoger(rol);
}

/**
 * De rechten zoals de schermen ze gebruiken.
 *
 * De naam zegt wat iemand doet, niet welke rol hij heeft. Zo hoeft een sjabloon
 * niet te weten dat "klas vergrendelen" bij mentor begint — verschuift die
 * grens, dan verschuift hij hier.
 */
export const RECHTEN = {
  /** Memo TW1/TW2/TW3 invullen en bijwerken. */
  memoInvullen: isBekendeGebruiker,
  /** Een memo van een vakdocent verwijderen. */
  memoVerwijderen: isMentorOfHoger,
  /** Mentorvoorbereiding en voortgangsplan openen en opslaan. */
  voorbereidingBewerken: isMentorOfHoger,
  /** De invoer voor een klas sluiten of weer openzetten. */
  klasVergrendelen: isMentorOfHoger,
  /** Leerlingen toevoegen, bijwerken of importeren. */
  leerlingenBewerken: isMentorOfHoger,
  /** Leerlingen verwijderen — ook de knop die de hele lijst wist. */
  leerlingenVerwijderen: isCoordinatorOfHoger,
  /** Docent-vakkoppelingen toevoegen, bijwerken of verwijderen. */
  docentkoppelingBewerken: isMentorOfHoger,
  /** De hele docentenlijst wissen. */
  docentenlijstWissen: isCoordinatorOfHoger,
  /** Beheerdersoverzicht, toegangscodes en systeeminstellingen. */
  systeembeheer: isSuperuser,
} as const;

export type Recht = keyof typeof RECHTEN;

export function mag(rol: Rol, recht: Recht): boolean {
  return RECHTEN[recht](rol);
}
