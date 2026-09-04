export type UserRole = 'Superuser' | 'Docent' | 'Mentor' | 'Coordinator';

export interface ClassLock {
  id?: string;
  klas: string;
  periode: 'TW1' | 'TW2' | 'TW3';
  schooljaar: string;
  isLocked: boolean;
  lockedBy: string;
  lockedAt: string;
}


export interface AccessCode {
  id?: string;
  code: string;
  role: UserRole;
  ownerName: string;
  ownerEmail: string;
  vak?: string;
  createdAt: string;
  /**
   * Of de code nog gebruikt mag worden. Nieuwe codes krijgen `true`.
   *
   * Optioneel omdat codes van voor deze wijziging het veld niet hebben; die
   * gelden als actief (zie `utils/toegangscode.ts`). Intrekken zet hem op
   * `false` en is omkeerbaar -- verwijderen is dat niet, en dan is ook niet
   * meer te zien dat de code ooit bestaan heeft.
   */
  active?: boolean;
  /** Wanneer de code is ingetrokken of weer aangezet. */
  gewijzigdOp?: string;
  /**
   * Ongebruikt overblijfsel: dit veld werd nooit op `true` gezet. Blijft in het
   * model staan zodat bestaande documenten geldig zijn, en telt voor de
   * zekerheid mee als 'ingetrokken'.
   */
  used?: boolean;
}

export interface Leerling {
  id?: string;
  leerlingnummer: string;
  leerling: string;
  klas: string;
  mentorNaam: string;
  mentorEmail: string;
  schooljaar: string;
  actief: boolean;
}

export interface DocentTaak {
  id?: string;
  schooljaar: string;
  periode: 'TW1' | 'TW2' | 'TW3';
  klas: string;
  leerlingnummer: string;
  leerling: string;
  docentEmail: string;
  docentNaam: string;
  vak: string;
  mentorEmail: string;
  /**
   * Wordt niet meer gebruikt om te bepalen of het gedaan is — dat leiden we af
   * uit het bestaan van de memo (zie utils/taak-status.ts). Blijft staan zodat
   * bestaande documenten in Firestore geldig blijven.
   */
  status: 'Open' | 'Ingevuld';
  /** Wanneer de mentor voor het laatst een herinnering heeft gestuurd. */
  herinnerdOp?: string;
  aangemaaktOp: string;
  gewijzigdOp: string;
}

export interface DocentVak {

  id?: string;
  docentNaam: string;
  docentEmail: string;
  vak: string;
  klas: string;
  schooljaar: string;
  actief: boolean;
}

export interface MemoTW1TW2 {
  id?: string;
  schooljaar: string;
  toetsweek: 'TW1' | 'TW2';
  leerlingnummer: string;
  leerling: string;
  klas: string;
  docentNaam: string;
  docentEmail: string;
  vak: string;
  aandachtInhoudelijkBegrip: boolean;
  aandachtPlanningOrganisatie: boolean;
  aandachtToetsvoorbereidingLeerstrategie: boolean;
  aandachtInzetWerkhouding: boolean;
  aandachtWerkNietOpOrde: boolean;
  aandachtAanwezigheidVerzuim: boolean;
  waarZieJeDitAan: string;
  watWerktWel: string;
  leerlingActie: string;
  emc: 'Ja' | 'Nee' | null;
  docentActie: string;
  reflectieOpVorigePeriode?: string;
  status: 'Concept' | 'Definitief';
  aangemaaktDoor: string;
  aangemaaktOp: string;
  gewijzigdOp: string;
  /** Wie de laatste wijziging deed; nodig om te zien of een mentor de tekst van een docent heeft aangepast. */
  gewijzigdDoor?: string;
}

export interface MemoTW3 {
  id?: string;
  schooljaar: string;
  toetsweek: 'TW3';
  leerlingnummer: string;
  leerling: string;
  klas: string;
  docentNaam: string;
  docentEmail: string;
  vak: string;
  aandachtInhoudelijkBegrip: boolean;
  aandachtPlanningOrganisatie: boolean;
  aandachtToetsvoorbereidingLeerstrategie: boolean;
  aandachtInzetWerkhouding: boolean;
  aandachtWerkNietOpOrde: boolean;
  aandachtAanwezigheidVerzuim: boolean;
  waarZieJeDitAan: string;
  watWerktWel: string;
  doorstroomToelichting: string;
  reflectieOpVorigePeriode?: string;
  status: 'Concept' | 'Definitief';
  aangemaaktDoor: string;
  aangemaaktOp: string;
  gewijzigdOp: string;
  /** Wie de laatste wijziging deed; nodig om te zien of een mentor de tekst van een docent heeft aangepast. */
  gewijzigdDoor?: string;
}

export interface MentorVoorbereiding {
  id?: string;
  schooljaar: string;
  periode: 'TW1' | 'TW2' | 'TW3';
  leerlingnummer: string;
  leerling: string;
  klas: string;
  mentorNaam: string;
  mentorEmail: string;
  overzichtResultaten: string;
  belangrijksteSignalenUitMemos: string;
  aandachtspuntenPersoonlijkeAchtergrond: string;
  centraleBespreekvragen: string;
  status: 'Concept' | 'Definitief';
  aangemaaktDoor: string;
  aangemaaktOp: string;
  gewijzigdOp: string;
  /** Wie de laatste wijziging deed; nodig om te zien of een mentor de tekst van een docent heeft aangepast. */
  gewijzigdDoor?: string;
}

export interface Voortgangsplan {
  id?: string;
  schooljaar: string;
  periode: 'TW1' | 'TW2' | 'TW3';
  leerlingnummer: string;
  leerling: string;
  klas: string;
  mentorNaam: string;
  mentorEmail: string;
  gezamenlijkeConclusie: string;
  afspraakLeerling1: string;
  afspraakLeerling2: string;
  afspraakLeerling3: string;
  afspraakDocenten1: string;
  afspraakDocenten2: string;
  afspraakDocenten3: string;
  evaluatieWanneer: string;
  evaluatieDoorWie: string;
  terugkoppelingOuders: string;
  status: 'Concept' | 'Definitief';
  aangemaaktDoor: string;
  aangemaaktOp: string;
  gewijzigdOp: string;
  /** Wie de laatste wijziging deed; nodig om te zien of een mentor de tekst van een docent heeft aangepast. */
  gewijzigdDoor?: string;
}
