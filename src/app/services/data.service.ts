import { Injectable, effect, signal } from '@angular/core';
import { Leerling, Docent, DocentVak, MemoTW1TW2, MemoTW3, MentorVoorbereiding, Voortgangsplan, ClassLock, DocentTaak } from '../models/data.models';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, sessieActief } from './firebase';
import { Luisteraars, Stopper } from '../utils/luisteraars';
import { komtDocentOvereen, losDocentIdentiteitOp } from '../utils/docent-identiteit';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

/**
 * Vertaalt een Firestore-foutcode naar iets wat een docent of mentor begrijpt.
 * De technische details blijven in de console staan.
 */
function leesbareMelding(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'permission-denied':
      return 'Je hebt geen rechten om dit op te slaan. Log opnieuw in of vraag de beheerder om hulp.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'Geen verbinding met de database. Controleer je internetverbinding en probeer het opnieuw.';
    case 'unauthenticated':
      return 'Je sessie is verlopen. Log opnieuw in en probeer het nog een keer.';
    case 'not-found':
      return 'Dit item bestaat niet meer. Mogelijk heeft iemand anders het verwijderd.';
    case 'resource-exhausted':
      return 'De database is tijdelijk overbelast. Probeer het over een paar minuten opnieuw.';
    default:
      return 'Opslaan is niet gelukt. Je invoer staat nog in het formulier; probeer het opnieuw.';
  }
}

/**
 * Logt de technische details en gooit een fout met een leesbare tekst.
 *
 * Gooide eerder een JSON-blok als foutmelding, dat rechtstreeks in beeld kwam
 * als er al iets mee werd gedaan. De aanroeper kan nu gewoon `e.message` tonen.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  const fout = new Error(leesbareMelding(error));
  (fout as Error & { technischeDetails?: string }).technischeDetails = JSON.stringify(errInfo);
  throw fout;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  leerlingen = signal<Leerling[]>([]);
  docentVakken = signal<DocentVak[]>([]);
  /** De docenten als personen, met hun schoolafkorting als sleutel. */
  docenten = signal<Docent[]>([]);
  memoTW1TW2 = signal<MemoTW1TW2[]>([]);
  memoTW3 = signal<MemoTW3[]>([]);
  mentorVoorbereiding = signal<MentorVoorbereiding[]>([]);
  voortgangsplan = signal<Voortgangsplan[]>([]);
  classLocks = signal<ClassLock[]>([]);
  docentTaken = signal<DocentTaak[]>([]);

  /**
   * Gevuld zodra een van de luisteraars de database niet meer kan bereiken.
   * De luisteraars gooiden hier eerder een fout, maar niemand vangt die op in
   * een asynchrone callback: het werd een onafgevangen fout in de console, de
   * luisteraar was dood en het scherm bleef leeg alsof er geen gegevens waren.
   */
  verbindingsfout = signal<string | null>(null);

  private luisteraars = new Luisteraars();

  constructor() {
    // Tijdens het voorrenderen bestaat er geen sessie en valt er niets te
    // luisteren; de schermen halen hun gegevens toch pas in de browser op.
    if (typeof window === 'undefined') return;

    // De luisteraars volgen de sessie: aan zodra AuthService het
    // sessiedocument in Firestore heeft staan, uit zodra dat verdwijnt.
    //
    // Startten ze meteen bij het opstarten van de app, dan weigerden de
    // beveiligingsregels alle acht en bleef elk scherm leeg. Bleven ze ná het
    // uitloggen aanstaan, dan kregen ze prompt 'permission-denied' omdat hun
    // eigen sessiedocument net was verwijderd -- en kwamen ze bij een volgende
    // inlog niet meer terug.
    effect(() => {
      if (sessieActief()) this.startListeners();
      else this.stopListeners();
    });
  }

  /**
   * Zet de acht luisteraars op. Doet niets als ze al aanstaan.
   *
   * Openbaar zodat een scherm ze na een storing opnieuw kan aanzetten zonder de
   * pagina te herladen.
   */
  startListeners() {
    const gestart = this.luisteraars.start(() => this.maakLuisteraars());
    if (gestart) this.verbindingsfout.set(null);
  }

  /** Stopt de luisteraars en wist wat er van de vorige gebruiker in beeld stond. */
  stopListeners() {
    const liepen = this.luisteraars.stop();
    if (liepen > 0) this.clearData();
  }

  /**
   * Leegt alle signals en de verbindingsmelding.
   *
   * Zonder dit bleven na het uitloggen de leerlingen en memo's van de vorige
   * gebruiker in het geheugen staan. Logde er in hetzelfde tabblad iemand
   * anders in, dan zag die eerst nog even andermans gegevens.
   */
  clearData() {
    this.leerlingen.set([]);
    this.docentVakken.set([]);
    this.docenten.set([]);
    this.memoTW1TW2.set([]);
    this.memoTW3.set([]);
    this.mentorVoorbereiding.set([]);
    this.voortgangsplan.set([]);
    this.classLocks.set([]);
    this.docentTaken.set([]);
    this.verbindingsfout.set(null);
  }

  private maakLuisteraars(): Stopper[] {
    return [
      onSnapshot(collection(db, 'leerlingen'), (snapshot) => {
        this.leerlingen.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Leerling)));
      }, (error) => this.meldVerbindingsprobleem(error, 'leerlingen')),
      onSnapshot(collection(db, 'docenten'), (snapshot) => {
        this.docenten.set(snapshot.docs.map(d => ({ ...d.data(), afkorting: d.id } as Docent)));
      }, (error) => this.meldVerbindingsprobleem(error, 'docenten')),
      onSnapshot(collection(db, 'docentenVakken'), (snapshot) => {
        this.docentVakken.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DocentVak)));
      }, (error) => this.meldVerbindingsprobleem(error, 'docentenVakken')),
      onSnapshot(collection(db, 'memoTW1TW2'), (snapshot) => {
        this.memoTW1TW2.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MemoTW1TW2)));
      }, (error) => this.meldVerbindingsprobleem(error, 'memoTW1TW2')),
      onSnapshot(collection(db, 'memoTW3'), (snapshot) => {
        this.memoTW3.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MemoTW3)));
      }, (error) => this.meldVerbindingsprobleem(error, 'memoTW3')),
      onSnapshot(collection(db, 'mentorVoorbereiding'), (snapshot) => {
        this.mentorVoorbereiding.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MentorVoorbereiding)));
      }, (error) => this.meldVerbindingsprobleem(error, 'mentorVoorbereiding')),
      onSnapshot(collection(db, 'voortgangsplan'), (snapshot) => {
        this.voortgangsplan.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Voortgangsplan)));
      }, (error) => this.meldVerbindingsprobleem(error, 'voortgangsplan')),
      onSnapshot(collection(db, 'classLocks'), (snapshot) => {
        this.classLocks.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ClassLock)));
      }, (error) => this.meldVerbindingsprobleem(error, 'classLocks')),
      onSnapshot(collection(db, 'docentTaken'), (snapshot) => {
        this.docentTaken.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DocentTaak)));
      }, (error) => this.meldVerbindingsprobleem(error, 'docentTaken')),
    ];
  }

  /** Zet de verbindingsfout klaar voor het scherm in plaats van te gooien. */
  private meldVerbindingsprobleem(error: unknown, pad: string) {
    console.error(`Firestore-luisteraar op '${pad}' gaf een fout:`, error);
    // Alleen in de browser. Tijdens het vooraf renderen op de server zou een
    // tijdelijke storing anders als waarschuwing in de statische pagina belanden.
    if (typeof window === 'undefined') return;
    this.verbindingsfout.set(leesbareMelding(error));
  }

  private generateId(collectionName: string = 'ids'): string {
    // Native Firestore collision-safe 20-karakter ID generatie
    return doc(collection(db, collectionName)).id;
  }

  /**
   * Schrijft of werkt veel documenten in één keer bij.
   *
   * Een klassenlijst uit Magister telt al snel 1.500 leerlingen. Die stuk voor
   * stuk wegschrijven kost evenveel netwerkrondjes en duurt minuten; met
   * gebundelde schrijfacties zijn het er een handvol. Firestore staat 500
   * bewerkingen per bundel toe, daarom knippen we in stukken van 450.
   */
  private async bulkSave<T extends object>(collectionName: string, items: { id?: string; data: T }[]) {
    const { writeBatch } = await import('firebase/firestore');
    const BUNDEL = 450;

    for (let start = 0; start < items.length; start += BUNDEL) {
      const batch = writeBatch(db);
      for (const item of items.slice(start, start + BUNDEL)) {
        const id = item.id ?? this.generateId(collectionName);
        // merge zodat bij het bijwerken velden blijven staan die niet in de CSV zitten.
        batch.set(doc(db, collectionName, id), { ...item.data, id }, { merge: true });
      }
      await batch.commit();
    }
  }

  /** Verwijdert veel documenten in één keer, zie bulkSave voor de reden. */
  private async bulkDelete(collectionName: string, ids: string[]) {
    const { writeBatch } = await import('firebase/firestore');
    const BUNDEL = 450;

    for (let start = 0; start < ids.length; start += BUNDEL) {
      const batch = writeBatch(db);
      for (const id of ids.slice(start, start + BUNDEL)) {
        batch.delete(doc(db, collectionName, id));
      }
      await batch.commit();
    }
  }

  // --- Leerlingen ---
  async addLeerling(item: Omit<Leerling, 'id'>): Promise<string> {
    try {
      const id = this.generateId('leerlingen');
      await setDoc(doc(db, 'leerlingen', id), { ...item, id });
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'leerlingen');
      throw e;
    }
  }

  async updateLeerling(id: string, updates: Partial<Leerling>) {
    try {
      await setDoc(doc(db, 'leerlingen', id), updates, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'leerlingen'); }
  }

  async deleteLeerling(id: string) {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'leerlingen', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'leerlingen'); }
  }

  /** Slaat een hele klassenlijst in één keer op; id gevuld = bijwerken, leeg = nieuw. */
  async bulkSaveLeerlingen(items: { id?: string; data: Omit<Leerling, 'id'> }[]) {
    try {
      await this.bulkSave('leerlingen', items);
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'leerlingen'); }
  }

  async bulkDeleteLeerlingen(ids: string[]) {
    try {
      await this.bulkDelete('leerlingen', ids);
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'leerlingen'); }
  }

  // --- DocentenVakken ---
  // --- Docenten ---

  /**
   * Zet een docent neer of werkt hem bij.
   *
   * Het document-ID is de afkorting; er is dus geen aparte `add` en `update`.
   * Wie dezelfde afkorting nog eens wegschrijft, overschrijft dezelfde docent --
   * en dat is precies de bedoeling van een sleutel die uit de school komt.
   * Of de afkorting mag, wordt vooraf gecontroleerd in utils/docent-afkorting.
   */
  async saveDocent(docent: Docent) {
    const afkorting = docent.afkorting;
    try {
      const bestaat = this.docenten().some(d => d.afkorting === afkorting);
      const nu = new Date().toISOString();
      await setDoc(
        doc(db, 'docenten', afkorting),
        {
          ...docent,
          afkorting,
          aangemaaktOp: docent.aangemaaktOp ?? nu,
          gewijzigdOp: nu,
        },
        { merge: bestaat },
      );
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'docenten'); }
  }

  async deleteDocent(afkorting: string) {
    try {
      await deleteDoc(doc(db, 'docenten', afkorting));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'docenten'); }
  }

  async addDocentVak(item: Omit<DocentVak, 'id'>): Promise<string> {
    try {
      const id = this.generateId('docentenVakken');
      await setDoc(doc(db, 'docentenVakken', id), { ...item, id });
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'docentenVakken');
      throw e;
    }
  }

  async updateDocentVak(id: string, updates: Partial<DocentVak>) {
    try {
      await setDoc(doc(db, 'docentenVakken', id), updates, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'docentenVakken'); }
  }

  async deleteDocentVak(id: string) {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'docentenVakken', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'docentenVakken'); }
  }

  async bulkDeleteDocentVakken(ids: string[]) {
    try {
      await this.bulkDelete('docentenVakken', ids);
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'docentenVakken'); }
  }

  /** Slaat een hele docenten-/vakkenlijst in één keer op. */
  async bulkSaveDocentVakken(items: { id?: string; data: Omit<DocentVak, 'id'> }[]) {
    try {
      await this.bulkSave('docentenVakken', items);
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'docentenVakken'); }
  }

  // --- Memos TW1/TW2 ---
  async addMemoTW1TW2(item: Omit<MemoTW1TW2, 'id'>): Promise<string> {
    try {
      const id = this.generateId('memoTW1TW2');
      await setDoc(doc(db, 'memoTW1TW2', id), { ...item, id });
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'memoTW1TW2');
      throw e;
    }
  }

  async updateMemoTW1TW2(id: string, updates: Partial<MemoTW1TW2>) {
    try {
      await setDoc(doc(db, 'memoTW1TW2', id), updates, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'memoTW1TW2'); }
  }

  async deleteMemoTW1TW2(id: string) {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'memoTW1TW2', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'memoTW1TW2'); }
  }

  async bulkDeleteMemoTW1TW2(ids: string[]) {
    try {
      await this.bulkDelete('memoTW1TW2', ids);
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'memoTW1TW2'); }
  }

  // --- Memos TW3 ---
  async addMemoTW3(item: Omit<MemoTW3, 'id'>): Promise<string> {
    try {
      const id = this.generateId('memoTW3');
      await setDoc(doc(db, 'memoTW3', id), { ...item, id });
      return id;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'memoTW3');
      throw e;
    }
  }

  async updateMemoTW3(id: string, updates: Partial<MemoTW3>) {
    try {
      await setDoc(doc(db, 'memoTW3', id), updates, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'memoTW3'); }
  }

  async deleteMemoTW3(id: string) {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'memoTW3', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'memoTW3'); }
  }

  async bulkDeleteMemoTW3(ids: string[]) {
    try {
      await this.bulkDelete('memoTW3', ids);
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'memoTW3'); }
  }

  // --- Access Codes ---
  async deleteCode(id: string) {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'codes', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'codes'); }
  }

  async bulkDeleteCodes(ids: string[]) {
    try {
      await this.bulkDelete('codes', ids);
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'codes'); }
  }

  // --- Mentor Voorbereiding ---
  async saveMentorVoorbereiding(item: Partial<MentorVoorbereiding> & { leerlingnummer: string, periode: string, schooljaar: string }) {
    try {
      const existing = this.mentorVoorbereiding().find(i => 
        i.leerlingnummer === item.leerlingnummer && 
        i.periode === item.periode && 
        i.schooljaar === item.schooljaar
      );
      
      if (existing && existing.id) {
        await setDoc(doc(db, 'mentorVoorbereiding', existing.id), item, { merge: true });
      } else {
        const id = this.generateId('mentorVoorbereiding');
        await setDoc(doc(db, 'mentorVoorbereiding', id), { ...item, id });
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'mentorVoorbereiding'); }
  }

  // --- Voortgangsplan ---
  async saveVoortgangsplan(item: Partial<Voortgangsplan> & { leerlingnummer: string, periode: string, schooljaar: string }) {
    try {
      const existing = this.voortgangsplan().find(i => 
        i.leerlingnummer === item.leerlingnummer && 
        i.periode === item.periode && 
        i.schooljaar === item.schooljaar
      );
      
      if (existing && existing.id) {
        await setDoc(doc(db, 'voortgangsplan', existing.id), item, { merge: true });
      } else {
        const id = this.generateId('voortgangsplan');
        await setDoc(doc(db, 'voortgangsplan', id), { ...item, id });
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'voortgangsplan'); }
  }

  // --- Class Locks ---
  async toggleLock(klas: string, periode: 'TW1' | 'TW2' | 'TW3', schooljaar: string, isLocked: boolean) {
    try {
      const id = `${klas}_${periode}_${schooljaar}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      const currentUser = auth.currentUser;
      const lockedBy = currentUser?.email || 'Onbekend';
      const lockedAt = new Date().toISOString();
      
      const lockData: ClassLock = {
        id, klas, periode, schooljaar, isLocked, lockedBy, lockedAt
      };
      await setDoc(doc(db, 'classLocks', id), lockData, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'classLocks'); }
  }

  // --- Docent Taken ---
  async saveDocentTaak(item: Partial<DocentTaak> & { leerlingnummer: string, docentEmail: string, periode: string, schooljaar: string }) {
    try {
      const existing = this.docentTaken().find(i =>
        i.leerlingnummer === item.leerlingnummer &&
        komtDocentOvereen(i, item) &&
        i.periode === item.periode &&
        i.schooljaar === item.schooljaar
      );

      if (existing && existing.id) {
        await setDoc(doc(db, 'docentTaken', existing.id), item, { merge: true });
      } else {
        const id = this.generateId('docentTaken');
        await setDoc(doc(db, 'docentTaken', id), { ...item, id });
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'docentTaken'); }
  }

  /**
   * Zet taken uit voor meerdere leerlingen tegelijk.
   *
   * Taken die al bestaan worden overgeslagen in plaats van overschreven: de
   * knop schreef ze eerder opnieuw weg met status 'Open', waardoor een tweede
   * klik de voortgang van al afgeronde taken wiste.
   */
  async zetTakenUit(nieuweTaken: Omit<DocentTaak, 'id'>[]) {
    try {
      const sleutel = (t: { leerlingnummer: string; docentEmail: string; docentAfkorting?: string; periode: string; schooljaar: string }) => {
        const id = losDocentIdentiteitOp(t);
        return `${t.leerlingnummer}|${id.sleutel}|${t.periode}|${t.schooljaar}`;
      };

      const bestaand = new Set(this.docentTaken().map(sleutel));

      const teSchrijven = nieuweTaken
        .filter(taak => !bestaand.has(sleutel(taak)))
        .map(taak => ({ data: taak }));

      await this.bulkSave('docentTaken', teSchrijven);
      return teSchrijven.length;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'docentTaken');
      return 0;
    }
  }

  /** Legt vast dat er een herinnering is verstuurd, zonder de rest van de taak aan te raken. */
  async markeerHerinnerd(ids: string[], moment = new Date().toISOString()) {
    try {
      const { writeBatch } = await import('firebase/firestore');
      const BUNDEL = 450;
      for (let start = 0; start < ids.length; start += BUNDEL) {
        const batch = writeBatch(db);
        for (const id of ids.slice(start, start + BUNDEL)) {
          batch.set(doc(db, 'docentTaken', id), { herinnerdOp: moment }, { merge: true });
        }
        await batch.commit();
      }
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'docentTaken'); }
  }

  async deleteDocentTaak(id: string) {
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'docentTaken', id));
    } catch (e) { handleFirestoreError(e, OperationType.DELETE, 'docentTaken'); }
  }
}
