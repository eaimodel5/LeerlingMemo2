import { signal } from '@angular/core';
import {
  ClassLock,
  Docent,
  DocentTaak,
  DocentVak,
  Leerling,
  MemoTW1TW2,
  MemoTW3,
  MentorVoorbereiding,
  Voortgangsplan,
} from '../app/models/data.models';

/**
 * DataService zonder Firebase.
 *
 * De echte service schrijft naar Firestore en ziet het resultaat terug via
 * `onSnapshot`. Voor een test is dat onbruikbaar: er is geen database, en de
 * uitkomst zou van het netwerk afhangen. Deze versie houdt dezelfde signals bij
 * maar schrijft rechtstreeks in het geheugen — voor een component is het
 * verschil onzichtbaar, en de test kan achteraf gewoon in `memoTW1TW2()`
 * kijken wat er is weggeschreven.
 *
 * De upsert-regels zijn met opzet letterlijk overgenomen uit `data.service.ts`.
 * Wijkt de echte service af, dan hoort deze mee te wijzigen; anders test je
 * gedrag dat de app niet heeft.
 */
export class NepDataService {
  leerlingen = signal<Leerling[]>([]);
  docentVakken = signal<DocentVak[]>([]);
  docenten = signal<Docent[]>([]);
  memoTW1TW2 = signal<MemoTW1TW2[]>([]);
  memoTW3 = signal<MemoTW3[]>([]);
  mentorVoorbereiding = signal<MentorVoorbereiding[]>([]);
  voortgangsplan = signal<Voortgangsplan[]>([]);
  classLocks = signal<ClassLock[]>([]);
  docentTaken = signal<DocentTaak[]>([]);
  verbindingsfout = signal<string | null>(null);

  /** Elke schrijfactie in volgorde, zodat een test kan zien wat er is aangeroepen. */
  schrijfacties: { actie: string; id?: string }[] = [];

  /** Zet op een tekst om de eerstvolgende schrijfactie te laten mislukken. */
  volgendeSchrijffout: string | null = null;

  /** Spiegelt de levenscyclus van de echte service, zodat tests hem kunnen nabootsen. */
  luisteraarsActief = false;

  startListeners() {
    if (this.luisteraarsActief) return;
    this.luisteraarsActief = true;
    this.verbindingsfout.set(null);
  }

  stopListeners() {
    if (!this.luisteraarsActief) return;
    this.luisteraarsActief = false;
    this.clearData();
  }

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

  private teller = 0;

  private nieuwId(soort: string) {
    this.teller += 1;
    return `${soort}-nieuw-${this.teller}`;
  }

  private controleer(actie: string, id?: string) {
    this.schrijfacties.push({ actie, id });
    if (this.volgendeSchrijffout) {
      const melding = this.volgendeSchrijffout;
      this.volgendeSchrijffout = null;
      throw new Error(melding);
    }
  }

  // --- Leerlingen ---
  async addLeerling(item: Omit<Leerling, 'id'>): Promise<string> {
    const id = this.nieuwId('leerlingen');
    this.controleer('addLeerling', id);
    this.leerlingen.update(l => [...l, { ...item, id }]);
    return id;
  }

  async updateLeerling(id: string, updates: Partial<Leerling>) {
    this.controleer('updateLeerling', id);
    this.leerlingen.update(l => l.map(x => (x.id === id ? { ...x, ...updates } : x)));
  }

  async deleteLeerling(id: string) {
    this.controleer('deleteLeerling', id);
    this.leerlingen.update(l => l.filter(x => x.id !== id));
  }

  async bulkSaveLeerlingen(items: { id?: string; data: Omit<Leerling, 'id'> }[]) {
    for (const item of items) {
      if (item.id) await this.updateLeerling(item.id, item.data);
      else await this.addLeerling(item.data);
    }
  }

  async bulkDeleteLeerlingen(ids: string[]) {
    for (const id of ids) await this.deleteLeerling(id);
  }

  // --- Docenten ---
  async saveDocent(docent: Docent) {
    this.controleer('saveDocent', docent.afkorting);
    const nu = new Date().toISOString();
    this.docenten.update(l => {
      const bestaand = l.find(d => d.afkorting === docent.afkorting);
      const compleet = { ...docent, aangemaaktOp: docent.aangemaaktOp ?? bestaand?.aangemaaktOp ?? nu, gewijzigdOp: nu };
      return bestaand ? l.map(d => (d.afkorting === docent.afkorting ? compleet : d)) : [...l, compleet];
    });
  }

  async deleteDocent(afkorting: string) {
    this.controleer('deleteDocent', afkorting);
    this.docenten.update(l => l.filter(d => d.afkorting !== afkorting));
  }

  // --- Docent/vak ---
  async addDocentVak(item: Omit<DocentVak, 'id'>): Promise<string> {
    const id = this.nieuwId('docentenVakken');
    this.controleer('addDocentVak', id);
    this.docentVakken.update(l => [...l, { ...item, id }]);
    return id;
  }

  async updateDocentVak(id: string, updates: Partial<DocentVak>) {
    this.controleer('updateDocentVak', id);
    this.docentVakken.update(l => l.map(x => (x.id === id ? { ...x, ...updates } : x)));
  }

  async deleteDocentVak(id: string) {
    this.controleer('deleteDocentVak', id);
    this.docentVakken.update(l => l.filter(x => x.id !== id));
  }

  async bulkDeleteDocentVakken(ids: string[]) {
    for (const id of ids) await this.deleteDocentVak(id);
  }

  async bulkSaveDocentVakken(items: { id?: string; data: Omit<DocentVak, 'id'> }[]) {
    for (const item of items) {
      if (item.id) await this.updateDocentVak(item.id, item.data);
      else await this.addDocentVak(item.data);
    }
  }

  // --- Memo TW1/TW2 ---
  async addMemoTW1TW2(item: Omit<MemoTW1TW2, 'id'>): Promise<string> {
    const id = this.nieuwId('memoTW1TW2');
    this.controleer('addMemoTW1TW2', id);
    this.memoTW1TW2.update(l => [...l, { ...item, id }]);
    return id;
  }

  async updateMemoTW1TW2(id: string, updates: Partial<MemoTW1TW2>) {
    this.controleer('updateMemoTW1TW2', id);
    this.memoTW1TW2.update(l => l.map(x => (x.id === id ? { ...x, ...updates } : x)));
  }

  async deleteMemoTW1TW2(id: string) {
    this.controleer('deleteMemoTW1TW2', id);
    this.memoTW1TW2.update(l => l.filter(x => x.id !== id));
  }

  async bulkDeleteMemoTW1TW2(ids: string[]) {
    for (const id of ids) await this.deleteMemoTW1TW2(id);
  }

  // --- Memo TW3 ---
  async addMemoTW3(item: Omit<MemoTW3, 'id'>): Promise<string> {
    const id = this.nieuwId('memoTW3');
    this.controleer('addMemoTW3', id);
    this.memoTW3.update(l => [...l, { ...item, id }]);
    return id;
  }

  async updateMemoTW3(id: string, updates: Partial<MemoTW3>) {
    this.controleer('updateMemoTW3', id);
    this.memoTW3.update(l => l.map(x => (x.id === id ? { ...x, ...updates } : x)));
  }

  async deleteMemoTW3(id: string) {
    this.controleer('deleteMemoTW3', id);
    this.memoTW3.update(l => l.filter(x => x.id !== id));
  }

  async bulkDeleteMemoTW3(ids: string[]) {
    for (const id of ids) await this.deleteMemoTW3(id);
  }

  // --- Codes ---
  async deleteCode(id: string) {
    this.controleer('deleteCode', id);
  }

  async bulkDeleteCodes(ids: string[]) {
    for (const id of ids) await this.deleteCode(id);
  }

  // --- Mentorvoorbereiding ---
  async saveMentorVoorbereiding(
    item: Partial<MentorVoorbereiding> & { leerlingnummer: string; periode: string; schooljaar: string },
  ) {
    const bestaand = this.mentorVoorbereiding().find(
      i =>
        i.leerlingnummer === item.leerlingnummer &&
        i.periode === item.periode &&
        i.schooljaar === item.schooljaar,
    );
    if (bestaand?.id) {
      this.controleer('saveMentorVoorbereiding:update', bestaand.id);
      this.mentorVoorbereiding.update(l =>
        l.map(x => (x.id === bestaand.id ? ({ ...x, ...item } as MentorVoorbereiding) : x)),
      );
    } else {
      const id = this.nieuwId('mentorVoorbereiding');
      this.controleer('saveMentorVoorbereiding:create', id);
      this.mentorVoorbereiding.update(l => [...l, { ...(item as MentorVoorbereiding), id }]);
    }
  }

  // --- Voortgangsplan ---
  async saveVoortgangsplan(
    item: Partial<Voortgangsplan> & { leerlingnummer: string; periode: string; schooljaar: string },
  ) {
    const bestaand = this.voortgangsplan().find(
      i =>
        i.leerlingnummer === item.leerlingnummer &&
        i.periode === item.periode &&
        i.schooljaar === item.schooljaar,
    );
    if (bestaand?.id) {
      this.controleer('saveVoortgangsplan:update', bestaand.id);
      this.voortgangsplan.update(l =>
        l.map(x => (x.id === bestaand.id ? ({ ...x, ...item } as Voortgangsplan) : x)),
      );
    } else {
      const id = this.nieuwId('voortgangsplan');
      this.controleer('saveVoortgangsplan:create', id);
      this.voortgangsplan.update(l => [...l, { ...(item as Voortgangsplan), id }]);
    }
  }

  // --- Klassloten ---
  async toggleLock(klas: string, periode: 'TW1' | 'TW2' | 'TW3', schooljaar: string, isLocked: boolean) {
    const id = `${klas}_${periode}_${schooljaar}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    this.controleer('toggleLock', id);
    const nieuw: ClassLock = {
      id,
      klas,
      periode,
      schooljaar,
      isLocked,
      lockedBy: 'test',
      lockedAt: new Date().toISOString(),
    };
    this.classLocks.update(l => (l.some(x => x.id === id) ? l.map(x => (x.id === id ? nieuw : x)) : [...l, nieuw]));
  }

  // --- Docenttaken ---
  async saveDocentTaak(
    item: Partial<DocentTaak> & { leerlingnummer: string; docentEmail: string; periode: string; schooljaar: string },
  ) {
    const email = item.docentEmail.trim().toLowerCase();
    const bestaand = this.docentTaken().find(
      i =>
        i.leerlingnummer === item.leerlingnummer &&
        i.docentEmail.trim().toLowerCase() === email &&
        i.periode === item.periode &&
        i.schooljaar === item.schooljaar,
    );
    if (bestaand?.id) {
      this.controleer('saveDocentTaak:update', bestaand.id);
      this.docentTaken.update(l => l.map(x => (x.id === bestaand.id ? ({ ...x, ...item } as DocentTaak) : x)));
    } else {
      const id = this.nieuwId('docentTaken');
      this.controleer('saveDocentTaak:create', id);
      this.docentTaken.update(l => [...l, { ...(item as DocentTaak), id }]);
    }
  }

  async zetTakenUit(nieuweTaken: Omit<DocentTaak, 'id'>[]) {
    const sleutel = (t: { leerlingnummer: string; docentEmail: string; periode: string; schooljaar: string }) =>
      `${t.leerlingnummer}|${t.docentEmail.trim().toLowerCase()}|${t.periode}|${t.schooljaar}`;
    const bestaand = new Set(this.docentTaken().map(sleutel));
    const teSchrijven = nieuweTaken.filter(taak => !bestaand.has(sleutel(taak)));
    this.controleer('zetTakenUit');
    for (const taak of teSchrijven) {
      const id = this.nieuwId('docentTaken');
      this.docentTaken.update(l => [...l, { ...taak, id }]);
    }
    return teSchrijven.length;
  }

  async markeerHerinnerd(ids: string[], moment = new Date().toISOString()) {
    this.controleer('markeerHerinnerd');
    this.docentTaken.update(l => l.map(x => (x.id && ids.includes(x.id) ? { ...x, herinnerdOp: moment } : x)));
  }

  async deleteDocentTaak(id: string) {
    this.controleer('deleteDocentTaak', id);
    this.docentTaken.update(l => l.filter(x => x.id !== id));
  }
}
