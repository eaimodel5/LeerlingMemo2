import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../services/data.service';
import { Leerling } from '../models/data.models';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { parseCsv, downloadCsv } from '../utils/csv';
import { normaliseerKoppen, rijNaarObject, leesLeerlingRij } from '../utils/leerling-import';

@Component({
  selector: 'app-manage-students',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative">
      @if (bezig()) {
        <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div class="bg-white rounded-xl shadow-xl px-8 py-6 flex items-center gap-4">
            <mat-icon class="animate-spin text-slate-400">progress_activity</mat-icon>
            <span class="text-sm font-medium text-slate-700">Bezig met opslaan, even geduld…</span>
          </div>
        </div>
      }

      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Beheer Leerlingen</h2>
        <div class="flex gap-2 mt-2 sm:mt-0 overflow-x-auto">
          <button (click)="fileInput.click()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">upload_file</mat-icon> Importeer CSV
          </button>
          <input type="file" #fileInput class="hidden" accept=".csv" (change)="importCSV($event)">
          <button (click)="downloadTemplate()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">download</mat-icon> Template
          </button>
          <button (click)="deleteAllStudents()" class="px-3 py-1.5 text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Wis alle leerlingen">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">delete_sweep</mat-icon> Wis Lijst
          </button>
          <button (click)="openForm()" class="px-3 py-1.5 text-xs font-medium text-white bg-[#0d1e3a] hover:bg-[#1b3054] rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">add</mat-icon> Nieuw
          </button>
        </div>
      </header>

      <div class="flex-1 p-4 sm:p-8 space-y-6">
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
          <div class="relative flex-1 min-w-[250px]">
            <mat-icon class="absolute left-3 top-2.5 text-slate-400">search</mat-icon>
            <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Zoek op naam, nummer of mentor..." class="w-full pl-10 pr-4 p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
          </div>
          <div>
            <select [ngModel]="filterKlas()" (ngModelChange)="filterKlas.set($event)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[150px]">
              <option value="">Alle Klassen</option>
              @for (k of availableKlassen(); track k) {
                <option [value]="k">{{k}}</option>
              }
            </select>
          </div>
          <div class="sm:hidden w-full mt-2">
             <button (click)="openForm()" class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2">
               <mat-icon class="text-[18px] w-[18px] h-[18px]">add</mat-icon> Nieuwe Leerling
             </button>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Nummer</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Naam</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Klas</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Mentor</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Status</th>
                <th class="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">Acties</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              @for (l of zichtbareLeerlingen(); track l.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{{l.leerlingnummer}}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{{l.leerling}}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{{l.klas}}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{{l.mentorNaam}}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    @if (l.actief) {
                      <span class="px-2.5 py-1 inline-flex text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-800 border-0">Actief</span>
                    } @else {
                      <span class="px-2.5 py-1 inline-flex text-[10px] uppercase font-bold rounded-full bg-slate-100 text-slate-500 border-0">Inactief</span>
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button (click)="toggleActive(l)" class="text-slate-400 hover:text-slate-600 transition-colors mx-2" title="{{l.actief ? 'Deactiveer' : 'Activeer'}}">
                      <mat-icon class="text-[20px] w-[20px] h-[20px]">{{l.actief ? 'block' : 'check_circle'}}</mat-icon>
                    </button>
                    <button (click)="edit(l)" class="text-blue-600 hover:text-blue-800 transition-colors ml-2 mr-2" title="Bewerk">
                      <mat-icon class="text-[20px] w-[20px] h-[20px]">edit</mat-icon>
                    </button>
                    <button (click)="deleteItem(l)" class="text-red-500 hover:text-red-700 transition-colors ml-1" title="Verwijder">
                      <mat-icon class="text-[20px] w-[20px] h-[20px]">delete</mat-icon>
                    </button>
                  </td>
                </tr>
              }
              @if (filteredLeerlingen().length === 0) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                    <div class="flex flex-col items-center justify-center">
                      <mat-icon class="text-4xl text-slate-300 mb-2 opacity-50">search_off</mat-icon>
                      <p class="text-sm font-medium">Geen leerlingen gevonden.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>

          @if (aantalVerborgen() > 0) {
            <div class="px-6 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-800 flex items-center gap-2">
              <mat-icon class="text-[16px] w-[16px] h-[16px]">filter_list</mat-icon>
              Nog {{ aantalVerborgen() }} leerlingen niet getoond. Kies een klas of zoek op naam om de lijst te verkleinen.
            </div>
          }
        </div>

        <p class="text-xs text-slate-500 px-1">
          {{ filteredLeerlingen().length }} van {{ totaalLeerlingen() }} leerlingen
          @if (filterKlas()) { <span>in klas {{ filterKlas() }}</span> }
        </p>
      </div>

      <!-- Formulier Modal -->
      @if (showForm()) {
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">{{editingId() ? 'Wijzig' : 'Nieuwe'}} Leerling</h3>
              <button (click)="closeForm()" class="text-slate-400 hover:text-slate-600 transition-colors">
                <mat-icon class="text-[20px] w-[20px] h-[20px]">close</mat-icon>
              </button>
            </div>
            
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex-1 p-6 flex flex-col gap-4">
              <input type="hidden" formControlName="schooljaar">
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Leerlingnummer *</label>
                  <input type="text" formControlName="leerlingnummer" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Klas *</label>
                  <input type="text" formControlName="klas" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Naam Leerling *</label>
                <input type="text" formControlName="leerling" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Mentor Naam *</label>
                  <input type="text" formControlName="mentorNaam" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Mentor Email *</label>
                  <input type="email" formControlName="mentorEmail" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
              </div>

              <div class="pt-2">
                <label class="flex items-center gap-2 cursor-pointer w-fit">
                  <input type="checkbox" formControlName="actief" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
                  <span class="text-sm font-semibold text-slate-700">Actief in systeem</span>
                </label>
              </div>

              <div class="pt-4 border-t border-slate-100 mt-2 flex justify-end gap-3">
                <button type="button" (click)="closeForm()" class="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">Annuleren</button>
                <button type="submit" class="px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm">Opslaan</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ManageStudentsComponent {
  private dataService = inject(DataService);
  private fb = inject(FormBuilder);

  searchQuery = signal('');
  filterKlas = signal('');
  showForm = signal(false);
  bezig = signal(false);
  editingId = signal<string | null>(null);

  form = this.fb.group({
    leerlingnummer: ['', Validators.required],
    leerling: ['', Validators.required],
    klas: ['', Validators.required],
    mentorNaam: ['', Validators.required],
    mentorEmail: ['', [Validators.required, Validators.email]],
    schooljaar: ['2026-2027'],
    actief: [true]
  });

  availableKlassen = computed(() => {
    const lln = this.dataService.leerlingen().filter(l => l.schooljaar === '2026-2027');
    // Leerlingen zonder klas leveren anders een lege optie in de keuzelijst op.
    return [...new Set(lln.map(l => l.klas).filter(klas => klas !== ''))].sort((a, b) => a.localeCompare(b, 'nl'));
  });

  filteredLeerlingen = computed(() => {
    let result = this.dataService.leerlingen().filter(l => l.schooljaar === '2026-2027');

    if (this.filterKlas()) {
      result = result.filter(l => l.klas === this.filterKlas());
    }

    if (this.searchQuery()) {
      const q = this.searchQuery().trim().toLowerCase();
      result = result.filter(l =>
        l.leerling.toLowerCase().includes(q) ||
        l.leerlingnummer.toLowerCase().includes(q) ||
        (l.mentorNaam || '').toLowerCase().includes(q)
      );
    }

    // Op klas en dan op naam, zodat een lijst van ruim duizend leerlingen
    // leesbaar blijft. localeCompare zet Nederlandse namen in de juiste volgorde.
    return [...result].sort((a, b) =>
      a.klas.localeCompare(b.klas, 'nl') || a.leerling.localeCompare(b.leerling, 'nl')
    );
  });

  /** Hoeveel rijen we tegelijk tonen; meer maakt de tabel merkbaar traag. */
  readonly maxZichtbaar = 250;

  zichtbareLeerlingen = computed(() => this.filteredLeerlingen().slice(0, this.maxZichtbaar));

  aantalVerborgen = computed(() => Math.max(0, this.filteredLeerlingen().length - this.maxZichtbaar));

  totaalLeerlingen = computed(() =>
    this.dataService.leerlingen().filter(l => l.schooljaar === '2026-2027').length
  );

  openForm() {
    this.form.reset({ schooljaar: '2026-2027', actief: true });
    this.editingId.set(null);
    this.showForm.set(true);
  }

  importCSV(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const rows = parseCsv(text);
      if (rows.length < 2) {
        alert('Er staan geen regels onder de kopregel. Controleer of je het juiste bestand hebt gekozen.');
        input.value = '';
        return;
      }

      const headers = normaliseerKoppen(rows[0]);
      const schooljaar = '2026-2027';

      const teSchrijven: { id?: string; data: Omit<Leerling, 'id'> }[] = [];
      let overgeslagen = 0;
      let zonderMentor = 0;
      let zonderMentorEmail = 0;

      // Binnen één bestand kan hetzelfde leerlingnummer twee keer voorkomen.
      const inDitBestand = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        // De kolomherkenning staat in leerling-import.ts, met tests tegen een
        // echte Magister-export.
        const { leerlingnummer, leerling, klas, mentorNaam, mentorEmail, actief } =
          leesLeerlingRij(rijNaarObject(headers, rows[i]));

        if (!leerlingnummer || !leerling) { overgeslagen++; continue; }
        if (inDitBestand.has(leerlingnummer)) { overgeslagen++; continue; }
        inDitBestand.add(leerlingnummer);

        if (!mentorNaam) zonderMentor++;
        if (!mentorEmail) zonderMentorEmail++;

        // Ontdubbelen: één leerling per leerlingnummer per schooljaar. Zonder deze
        // controle verdubbelde de hele lijst zodra iemand hetzelfde bestand opnieuw
        // importeerde na een correctie.
        const bestaand = this.dataService.leerlingen().find(l =>
          l.leerlingnummer === leerlingnummer && l.schooljaar === schooljaar
        );

        teSchrijven.push({
          id: bestaand?.id,
          data: {
            leerlingnummer: leerlingnummer,
            leerling: leerling,
            klas: klas,
            mentorNaam: mentorNaam,
            mentorEmail: mentorEmail,
            schooljaar: schooljaar,
            actief: actief
          }
        });
      }

      if (teSchrijven.length === 0) {
        alert('Geen bruikbare regels gevonden. Er is per regel minimaal een leerlingnummer en een naam nodig.');
        input.value = '';
        return;
      }

      const nieuw = teSchrijven.filter(t => !t.id).length;
      const bijgewerkt = teSchrijven.length - nieuw;

      this.bezig.set(true);
      try {
        await this.dataService.bulkSaveLeerlingen(teSchrijven);

        const delen = [`${nieuw} nieuw`, `${bijgewerkt} bijgewerkt`];
        if (overgeslagen) delen.push(`${overgeslagen} overgeslagen`);

        let melding = 'Import klaar: ' + delen.join(', ') + '.';
        if (zonderMentor) {
          melding += `\n\nBij ${zonderMentor} leerlingen stond geen mentor in het bestand.`;
        }
        if (zonderMentorEmail === teSchrijven.length) {
          melding += '\n\nHet bestand bevat geen e-mailadressen van mentoren. Die velden zijn leeg gelaten; vul ze aan als je mentoren aan hun eigen klas wilt koppelen.';
        }
        alert(melding);
      } catch {
        alert('Er ging iets mis bij het opslaan. Mogelijk is maar een deel van de lijst weggeschreven; probeer het opnieuw.');
      } finally {
        this.bezig.set(false);
      }

      input.value = '';
    };
    reader.readAsText(file);
  }

  downloadTemplate() {
    downloadCsv('leerlingen_template.csv', [
      ['leerlingnummer', 'leerling', 'klas', 'mentorNaam', 'mentorEmail', 'schooljaar', 'actief'],
      ['114334', 'Dae Aartsen', '2HJ', 'Rumeysa Karaarslan', 'rkaraarslan@emmauscollege.nl', '2026-2027', 'true']
    ], ',');
  }

  closeForm() {
    this.showForm.set(false);
  }

  edit(item: any) {
    this.form.patchValue(item);
    this.editingId.set(item.id);
    this.showForm.set(true);
  }

  async deleteAllStudents() {
    // Let op: dit verwijdert wat er nú gefilterd op het scherm staat, niet alleen
    // de zichtbare 250 rijen. De melding noemt daarom het echte aantal.
    const teVerwijderen = this.filteredLeerlingen();
    if (teVerwijderen.length === 0) return;

    const waarover = this.filterKlas() || this.searchQuery()
      ? `de ${teVerwijderen.length} leerlingen die nu gefilterd zijn`
      : `ALLE ${teVerwijderen.length} leerlingen`;

    if (!confirm(`Weet je zeker dat je ${waarover} wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      return;
    }

    const ids = teVerwijderen.map(l => l.id).filter((id): id is string => !!id);

    this.bezig.set(true);
    try {
      await this.dataService.bulkDeleteLeerlingen(ids);
      alert(`${ids.length} leerlingen verwijderd.`);
    } catch {
      alert('Er ging iets mis bij het verwijderen. Mogelijk is maar een deel verwijderd.');
    } finally {
      this.bezig.set(false);
    }
  }

  async deleteItem(item: any) {
    if (!item?.id) return;
    if (!confirm(`Weet je zeker dat je leerling "${item.leerling}" (${item.leerlingnummer}) wilt verwijderen?`)) {
      return;
    }
    this.bezig.set(true);
    try {
      await this.dataService.deleteLeerling(item.id);
    } catch {
      alert('Er ging iets mis bij het verwijderen van deze leerling.');
    } finally {
      this.bezig.set(false);
    }
  }

  toggleActive(item: any) {
    this.dataService.updateLeerling(item.id, { actief: !item.actief });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    const val = this.form.value as any;
    const id = this.editingId();
    
    if (id) {
      this.dataService.updateLeerling(id, val);
    } else {
      this.dataService.addLeerling(val);
    }
    
    this.closeForm();
  }
}
