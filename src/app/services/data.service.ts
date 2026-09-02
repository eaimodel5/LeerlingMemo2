import { Injectable, signal } from '@angular/core';
import { Leerling, DocentVak, MemoTW1TW2, MemoTW3, MentorVoorbereiding, Voortgangsplan, ClassLock, DocentTaak } from '../models/data.models';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig as any) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  throw new Error(JSON.stringify(errInfo));
}

@Injectable({ providedIn: 'root' })
export class DataService {
  leerlingen = signal<Leerling[]>([]);
  docentVakken = signal<DocentVak[]>([]);
  memoTW1TW2 = signal<MemoTW1TW2[]>([]);
  memoTW3 = signal<MemoTW3[]>([]);
  mentorVoorbereiding = signal<MentorVoorbereiding[]>([]);
  voortgangsplan = signal<Voortgangsplan[]>([]);
  classLocks = signal<ClassLock[]>([]);
  docentTaken = signal<DocentTaak[]>([]);

  constructor() {
    this.initData();
  }

  private initData() {
    onSnapshot(collection(db, 'leerlingen'), (snapshot) => {
      this.leerlingen.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Leerling)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'leerlingen'));
    onSnapshot(collection(db, 'docentenVakken'), (snapshot) => {
      this.docentVakken.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DocentVak)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'docentenVakken'));
    onSnapshot(collection(db, 'memoTW1TW2'), (snapshot) => {
      this.memoTW1TW2.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MemoTW1TW2)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'memoTW1TW2'));
    onSnapshot(collection(db, 'memoTW3'), (snapshot) => {
      this.memoTW3.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MemoTW3)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'memoTW3'));
    onSnapshot(collection(db, 'mentorVoorbereiding'), (snapshot) => {
      this.mentorVoorbereiding.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as MentorVoorbereiding)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'mentorVoorbereiding'));
    onSnapshot(collection(db, 'voortgangsplan'), (snapshot) => {
      this.voortgangsplan.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Voortgangsplan)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'voortgangsplan'));
    onSnapshot(collection(db, 'classLocks'), (snapshot) => {
      this.classLocks.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ClassLock)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'classLocks'));
    onSnapshot(collection(db, 'docentTaken'), (snapshot) => {
      this.docentTaken.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as DocentTaak)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'docentTaken'));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
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
        const id = item.id ?? this.generateId();
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
  async addLeerling(item: Omit<Leerling, 'id'>) {
    try {
      const id = this.generateId();
      await setDoc(doc(db, 'leerlingen', id), { ...item, id });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'leerlingen'); }
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
  async addDocentVak(item: Omit<DocentVak, 'id'>) {
    try {
      const id = this.generateId();
      await setDoc(doc(db, 'docentenVakken', id), { ...item, id });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'docentenVakken'); }
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

  /** Slaat een hele docenten-/vakkenlijst in één keer op. */
  async bulkSaveDocentVakken(items: { id?: string; data: Omit<DocentVak, 'id'> }[]) {
    try {
      await this.bulkSave('docentenVakken', items);
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'docentenVakken'); }
  }

  // --- Memos TW1/TW2 ---
  async addMemoTW1TW2(item: Omit<MemoTW1TW2, 'id'>) {
    try {
      const id = this.generateId();
      await setDoc(doc(db, 'memoTW1TW2', id), { ...item, id });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'memoTW1TW2'); }
  }

  async updateMemoTW1TW2(id: string, updates: Partial<MemoTW1TW2>) {
    try {
      await setDoc(doc(db, 'memoTW1TW2', id), updates, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'memoTW1TW2'); }
  }

  // --- Memos TW3 ---
  async addMemoTW3(item: Omit<MemoTW3, 'id'>) {
    try {
      const id = this.generateId();
      await setDoc(doc(db, 'memoTW3', id), { ...item, id });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'memoTW3'); }
  }

  async updateMemoTW3(id: string, updates: Partial<MemoTW3>) {
    try {
      await setDoc(doc(db, 'memoTW3', id), updates, { merge: true });
    } catch (e) { handleFirestoreError(e, OperationType.WRITE, 'memoTW3'); }
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
        const id = this.generateId();
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
        const id = this.generateId();
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
        i.docentEmail === item.docentEmail &&
        i.periode === item.periode && 
        i.schooljaar === item.schooljaar
      );
      
      if (existing && existing.id) {
        await setDoc(doc(db, 'docentTaken', existing.id), item, { merge: true });
      } else {
        const id = this.generateId();
        await setDoc(doc(db, 'docentTaken', id), { ...item, id });
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
