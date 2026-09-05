import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { Docent, DocentVak } from '../models/data.models';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { parseCsv, downloadCsv } from '../utils/csv';
import {
  toonAfkorting,
  normaliseerAfkorting,
  afkortingIsGeldig,
  zelfdeAfkorting,
} from '../utils/docent-afkorting';
import { zelfdeEmail } from '../utils/taak-status';

@Component({
  selector: 'app-manage-teachers',
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
        <h2 class="text-lg font-semibold text-slate-700">Beheer Docenten / Vakken</h2>
        <div class="flex gap-2 mt-2 sm:mt-0 overflow-x-auto">
          <button id="knop-import-csv" (click)="fileInput.click()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">upload_file</mat-icon> Importeer CSV
          </button>
          <input type="file" #fileInput class="hidden" accept=".csv" (change)="importCSV($event)">
          <button id="knop-download-template" (click)="downloadTemplate()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">download</mat-icon> Template
          </button>
          @if (magLijstWissen()) {
            <button id="knop-wis-lijst" (click)="deleteAllTeachers()" class="px-3 py-1.5 text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Wis alle docenten">
              <mat-icon class="text-[16px] w-[16px] h-[16px]">delete_sweep</mat-icon> Wis Lijst
            </button>
          }
          <button id="knop-nieuwe-koppeling" (click)="openForm()" class="px-3 py-1.5 text-xs font-medium text-white bg-[#0d1e3a] hover:bg-[#1b3054] rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">add</mat-icon> Nieuw
          </button>
        </div>
      </header>

      <div class="flex-1 p-4 sm:p-8 space-y-6">
        @if (melding(); as m) {
          <div class="p-4 rounded-xl border flex items-center justify-between gap-3 text-sm shadow-sm"
               [class]="m.soort === 'ok' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : m.soort === 'fout' ? 'bg-red-50 text-red-900 border-red-200' : 'bg-blue-50 text-blue-900 border-blue-200'">
            <div class="flex items-center gap-2">
              <mat-icon class="text-[18px] w-[18px] h-[18px]">{{ m.soort === 'ok' ? 'check_circle' : m.soort === 'fout' ? 'error' : 'info' }}</mat-icon>
              <span>{{ m.tekst }}</span>
            </div>
            <button (click)="melding.set(null)" class="text-slate-400 hover:text-slate-600 text-xs">Sluiten</button>
          </div>
        }

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
          <div class="relative flex-1 min-w-[250px]">
            <mat-icon class="absolute left-3 top-2.5 text-slate-400">search</mat-icon>
            <input id="zoek-koppelingen" type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Zoek op docent, afkorting, vak of klas..." class="w-full pl-10 pr-4 p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
          </div>
          <div>
            <select id="filter-klas" [ngModel]="filterKlas()" (ngModelChange)="filterKlas.set($event)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none min-w-[150px]">
               <option value="">Alle Klassen</option>
               @for (k of availableKlassen(); track k) {
                 <option [value]="k">{{k}}</option>
               }
            </select>
          </div>
          @if (aantalZonderAfkorting() > 0) {
            <button id="filter-zonder-afkorting" (click)="filterZonderAfkorting.set(!filterZonderAfkorting())"
                    class="px-3 py-2 text-xs font-medium rounded-md border transition-colors flex items-center gap-1.5"
                    [class]="filterZonderAfkorting() ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-inner' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'">
              <mat-icon class="text-[15px] w-[15px] h-[15px] text-amber-600">warning</mat-icon>
              {{ aantalZonderAfkorting() }} zonder afkorting
            </button>
          }
          <div class="sm:hidden w-full mt-2">
             <button (click)="openForm()" class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2">
               <mat-icon class="text-[18px] w-[18px] h-[18px]">add</mat-icon> Nieuwe Koppeling
             </button>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Docent</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Afkorting</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Vak</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Klas</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Status</th>
                <th class="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">Acties</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              @for (dv of filteredDocentVakken(); track dv.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">
                    <div>{{ dv.docentNaam }}</div>
                    @if (dv.docentEmail) {
                      <div class="text-xs font-normal text-slate-400">{{ dv.docentEmail }}</div>
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    @if (dv.docentAfkorting) {
                      <span class="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200" title="Schoolafkorting">
                        {{ toon(dv.docentAfkorting) }}
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200" title="Koppeling heeft nog geen schoolafkorting">
                        <mat-icon class="text-[13px] w-[13px] h-[13px] text-amber-600">warning</mat-icon> Geen afkorting
                      </span>
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{{ dv.vak }}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{{ dv.klas }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    @if (dv.actief) {
                      <span class="px-2.5 py-1 inline-flex text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-800 border-0">Actief</span>
                    } @else {
                      <span class="px-2.5 py-1 inline-flex text-[10px] uppercase font-bold rounded-full bg-slate-100 text-slate-500 border-0">Inactief</span>
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end gap-2">
                    <button (click)="toggleActive(dv)" class="text-slate-400 hover:text-slate-600 transition-colors" title="{{dv.actief ? 'Deactiveer' : 'Activeer'}}">
                      <mat-icon class="text-[20px] w-[20px] h-[20px]">{{dv.actief ? 'block' : 'check_circle'}}</mat-icon>
                    </button>
                    <button (click)="edit(dv)" class="text-blue-600 hover:text-blue-800 transition-colors mx-2" title="Bewerk">
                      <mat-icon class="text-[20px] w-[20px] h-[20px]">edit</mat-icon>
                    </button>
                  </td>
                </tr>
              }
              @if (filteredDocentVakken().length === 0) {
                <tr>
                  <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                    <div class="flex flex-col items-center justify-center">
                      <mat-icon class="text-4xl text-slate-300 mb-2 opacity-50">search_off</mat-icon>
                      <p class="text-sm font-medium">Geen docent-vak koppelingen gevonden.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Formulier Modal -->
      @if (showForm()) {
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">{{editingId() ? 'Wijzig' : 'Nieuwe'}} Koppeling</h3>
              <button (click)="closeForm()" class="text-slate-400 hover:text-slate-600 transition-colors">
                 <mat-icon class="text-[20px] w-[20px] h-[20px]">close</mat-icon>
              </button>
            </div>
            
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex-1 p-6 flex flex-col gap-4">
              <input type="hidden" formControlName="schooljaar">

              @if (actieveDocenten().length > 0) {
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1" for="select-bekende-docent">Kies uit Docentenbeheer</label>
                  <select id="select-bekende-docent" (change)="kiesBestaandeDocent($any($event.target).value)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">-- Kies docent (vult afkorting en naam in) --</option>
                    @for (d of actieveDocenten(); track d.afkorting) {
                      <option [value]="d.afkorting">{{ toonDocentOptie(d) }}</option>
                    }
                  </select>
                </div>
              }

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1" for="veld-afkorting">Afkorting</label>
                  <input id="veld-afkorting" type="text" formControlName="docentAfkorting" placeholder="bijv. VIS" class="w-full p-2 text-sm font-mono uppercase border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  @if (formAfkortingFout(); as fout) {
                    <p class="text-[11px] text-red-600 mt-1">{{ fout }}</p>
                  }
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1" for="veld-docent-naam">Naam Docent *</label>
                  <input id="veld-docent-naam" type="text" formControlName="docentNaam" placeholder="bijv. Hans Visser" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  @if (form.controls.docentNaam.touched && form.controls.docentNaam.invalid) {
                    <p class="text-[11px] text-red-600 mt-1">Naam is verplicht.</p>
                  }
                </div>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1" for="veld-docent-email">Docent Email (optioneel)</label>
                <input id="veld-docent-email" type="email" formControlName="docentEmail" placeholder="visser@school.nl" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                <p class="text-[11px] text-slate-400 mt-1">Docentafkorting is de primaire sleutel; e-mailadres dient als fallback voor legacy koppelingen.</p>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1" for="veld-vak">Vak *</label>
                  <input id="veld-vak" type="text" formControlName="vak" placeholder="bijv. Wiskunde" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  @if (form.controls.vak.touched && form.controls.vak.invalid) {
                    <p class="text-[11px] text-red-600 mt-1">Vak is verplicht.</p>
                  }
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1" for="veld-klas">Klas *</label>
                  <input id="veld-klas" type="text" formControlName="klas" placeholder="bijv. H4A" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  @if (form.controls.klas.touched && form.controls.klas.invalid) {
                    <p class="text-[11px] text-red-600 mt-1">Klas is verplicht.</p>
                  }
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
                <button type="submit" class="px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800 transition-colors shadow-sm">Opslaan</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ManageTeachersComponent {
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  /** De hele docentenlijst wissen blijft bij de coordinator. */
  magLijstWissen = computed(() => this.authService.mag('docentenlijstWissen'));

  searchQuery = signal('');
  filterKlas = signal('');
  filterZonderAfkorting = signal(false);
  showForm = signal(false);
  bezig = signal(false);
  editingId = signal<string | null>(null);
  formAfkortingFout = signal<string | null>(null);
  melding = signal<{ soort: 'ok' | 'fout' | 'info'; tekst: string } | null>(null);

  form = this.fb.group({
    docentAfkorting: [''],
    docentNaam: ['', Validators.required],
    docentEmail: [''],
    vak: ['', Validators.required],
    klas: ['', Validators.required],
    schooljaar: ['2026-2027'],
    actief: [true]
  });

  actieveDocenten = computed(() =>
    [...this.dataService.docenten()]
      .filter(d => d.actief)
      .sort((a, b) => a.afkorting.localeCompare(b.afkorting, 'nl'))
  );

  aantalZonderAfkorting = computed(() =>
    this.dataService.docentVakken().filter(l => l.schooljaar === '2026-2027' && !l.docentAfkorting).length
  );

  availableKlassen = computed(() => {
    const lln = this.dataService.docentVakken().filter(l => l.schooljaar === '2026-2027');
    return [...new Set(lln.map(l => l.klas))].sort();
  });

  filteredDocentVakken = computed(() => {
    let result = this.dataService.docentVakken().filter(l => l.schooljaar === '2026-2027');

    if (this.filterKlas()) {
      result = result.filter(l => l.klas === this.filterKlas());
    }

    if (this.filterZonderAfkorting()) {
      result = result.filter(l => !l.docentAfkorting);
    }

    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase().trim();
      result = result.filter(l =>
        l.docentNaam.toLowerCase().includes(q) ||
        (l.docentAfkorting && l.docentAfkorting.toLowerCase().includes(q)) ||
        (l.docentEmail && l.docentEmail.toLowerCase().includes(q)) ||
        l.vak.toLowerCase().includes(q) ||
        l.klas.toLowerCase().includes(q)
      );
    }
    return result;
  });

  toon(afkorting?: string | null): string {
    return toonAfkorting(afkorting);
  }

  toonDocentOptie(d: Docent): string {
    return `${toonAfkorting(d.afkorting)} - ${d.naam}`;
  }

  kiesBestaandeDocent(afkorting: string) {
    if (!afkorting) return;
    const docent = this.dataService.docenten().find(d => zelfdeAfkorting(d.afkorting, afkorting));
    if (docent) {
      this.form.patchValue({
        docentAfkorting: toonAfkorting(docent.afkorting),
        docentNaam: docent.naam
      });
      this.formAfkortingFout.set(null);
    }
  }

  openForm() {
    this.form.reset({
      docentAfkorting: '',
      docentNaam: '',
      docentEmail: '',
      vak: '',
      klas: '',
      schooljaar: '2026-2027',
      actief: true
    });
    this.editingId.set(null);
    this.formAfkortingFout.set(null);
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
        this.meldFout('Er staan geen regels onder de kopregel. Controleer of je het juiste bestand hebt gekozen.');
        input.value = '';
        return;
      }

      const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
      const schooljaar = '2026-2027';

      const teSchrijven: { id?: string; data: Omit<DocentVak, 'id'> }[] = [];
      let overgeslagen = 0;

      // Binnen één bestand kan dezelfde combinatie twee keer voorkomen.
      const inDitBestand = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        const obj: Record<string, string> = {};
        headers.forEach((h, index) => { obj[h] = values[index] ?? ''; });

        const rawAfkorting = obj['docentafkorting'] || obj['afkorting'] || obj['code'] || obj['docentcode'] || '';
        const rawNaam = obj['docentnaam'] || obj['docent'] || obj['naam'] || '';
        const rawEmail = (obj['docentemail'] || obj['email'] || '').trim();
        const vak = (obj['vak'] || obj['vaknaam'] || '').trim();
        const klas = (obj['klas'] || obj['groep'] || '').trim();

        // Docentafkorting verwerken indien meegegeven
        let afk: string | undefined;
        if (rawAfkorting.trim()) {
          const norm = normaliseerAfkorting(rawAfkorting);
          if (afkortingIsGeldig(norm)) {
            afk = norm;
          } else {
            // Ongeldige afkorting
            overgeslagen++;
            continue;
          }
        }

        // Naam bepalen: indien afk bekend is in Docentenbeheer, mag naam daaruit overgenomen worden
        let docentNaam = rawNaam.trim();
        if (!docentNaam && afk) {
          const bekendeDocent = this.dataService.docenten().find(d => zelfdeAfkorting(d.afkorting, afk));
          if (bekendeDocent) {
            docentNaam = bekendeDocent.naam;
          }
        }

        if (!docentNaam || !vak || !klas) {
          overgeslagen++;
          continue;
        }

        const identiteitSleutel = afk || rawEmail.toLowerCase() || docentNaam.toLowerCase();
        const sleutel = `${identiteitSleutel}|${vak.toLowerCase()}|${klas.toLowerCase()}`;
        if (inDitBestand.has(sleutel)) {
          overgeslagen++;
          continue;
        }
        inDitBestand.add(sleutel);

        const item: Omit<DocentVak, 'id'> = {
          docentNaam,
          docentEmail: rawEmail,
          ...(afk ? { docentAfkorting: afk } : {}),
          vak,
          klas,
          schooljaar,
          actief: obj['actief'] !== 'false' && obj['actief'] !== '0'
        };

        // Ontdubbelen: vind bestaande koppeling in de database
        const bestaand = this.dataService.docentVakken().find(dv => {
          if (dv.schooljaar !== schooljaar) return false;
          if (dv.klas.toLowerCase() !== klas.toLowerCase()) return false;
          if (dv.vak.toLowerCase() !== vak.toLowerCase()) return false;

          if (afk && dv.docentAfkorting) {
            return zelfdeAfkorting(dv.docentAfkorting, afk);
          }
          if (rawEmail && dv.docentEmail) {
            return zelfdeEmail(dv.docentEmail, rawEmail);
          }
          return dv.docentNaam.trim().toLowerCase() === docentNaam.toLowerCase();
        });

        teSchrijven.push({ id: bestaand?.id, data: item });
      }

      if (teSchrijven.length === 0) {
        this.meldFout('Geen bruikbare regels gevonden. Er is per regel een docent, een vak en een klas nodig.');
        input.value = '';
        return;
      }

      const nieuw = teSchrijven.filter(t => !t.id).length;
      const bijgewerkt = teSchrijven.length - nieuw;

      this.bezig.set(true);
      try {
        await this.dataService.bulkSaveDocentVakken(teSchrijven);
        const delen = [`${nieuw} nieuw`, `${bijgewerkt} bijgewerkt`];
        if (overgeslagen) delen.push(`${overgeslagen} overgeslagen`);
        const bericht = 'Import klaar: ' + delen.join(', ') + '.';
        this.melding.set({ soort: 'ok', tekst: bericht });
        alert(bericht);
      } catch {
        this.meldFout('Er ging iets mis bij het opslaan. Mogelijk is maar een deel van de lijst weggeschreven; probeer het opnieuw.');
      } finally {
        this.bezig.set(false);
      }

      input.value = '';
    };
    reader.readAsText(file);
  }

  downloadTemplate() {
    downloadCsv('docenten_vakken_template.csv', [
      ['docentAfkorting', 'docentNaam', 'docentEmail', 'vak', 'klas', 'schooljaar', 'actief'],
      ['VRI', 'J. de Vries', 'jdevries@school.nl', 'Wiskunde', '2HJ', '2026-2027', 'true']
    ], ',');
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formAfkortingFout.set(null);
  }

  edit(item: DocentVak) {
    this.form.patchValue({
      docentAfkorting: item.docentAfkorting ? toonAfkorting(item.docentAfkorting) : '',
      docentNaam: item.docentNaam || '',
      docentEmail: item.docentEmail || '',
      vak: item.vak || '',
      klas: item.klas || '',
      schooljaar: item.schooljaar || '2026-2027',
      actief: item.actief !== false
    });
    this.editingId.set(item.id ?? null);
    this.formAfkortingFout.set(null);
    this.showForm.set(true);
  }

  async deleteAllTeachers() {
    const teachers = this.filteredDocentVakken();
    if (teachers.length === 0) return;
    if (confirm(`Weet je zeker dat je ${teachers.length} docent-koppelingen wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      const ids = teachers.map(t => t.id).filter((id): id is string => !!id);
      this.bezig.set(true);
      try {
        await this.dataService.bulkDeleteDocentVakken(ids);
        const bericht = `${ids.length} docent-koppelingen succesvol verwijderd.`;
        this.melding.set({ soort: 'ok', tekst: bericht });
        alert(bericht);
      } catch {
        this.meldFout('Er ging iets mis bij het verwijderen van de koppelingen.');
      } finally {
        this.bezig.set(false);
      }
    }
  }

  toggleActive(item: DocentVak) {
    if (!item.id) return;
    this.dataService.updateDocentVak(item.id, { actief: !item.actief });
  }

  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const rawAfk = (val.docentAfkorting ?? '').trim();
    let cleanAfk: string | undefined;

    if (rawAfk) {
      const norm = normaliseerAfkorting(rawAfk);
      if (!afkortingIsGeldig(norm)) {
        this.formAfkortingFout.set('Een afkorting bestaat uit 2 tot 8 letters of cijfers (zonder spaties of leestekens).');
        return;
      }
      cleanAfk = norm;
    }

    this.formAfkortingFout.set(null);

    const docentVakData: Omit<DocentVak, 'id'> = {
      docentNaam: (val.docentNaam ?? '').trim(),
      docentEmail: (val.docentEmail ?? '').trim(),
      ...(cleanAfk ? { docentAfkorting: cleanAfk } : {}),
      vak: (val.vak ?? '').trim(),
      klas: (val.klas ?? '').trim(),
      schooljaar: val.schooljaar ?? '2026-2027',
      actief: val.actief !== false
    };

    const id = this.editingId();
    this.bezig.set(true);
    try {
      if (id) {
        await this.dataService.updateDocentVak(id, docentVakData);
        this.melding.set({ soort: 'ok', tekst: `Koppeling voor ${docentVakData.docentNaam} (${docentVakData.vak} - ${docentVakData.klas}) bijgewerkt.` });
      } else {
        await this.dataService.addDocentVak(docentVakData);
        this.melding.set({ soort: 'ok', tekst: `Koppeling voor ${docentVakData.docentNaam} (${docentVakData.vak} - ${docentVakData.klas}) toegevoegd.` });
      }
      this.closeForm();
    } catch {
      this.meldFout('Er ging iets mis bij het opslaan van de koppeling.');
    } finally {
      this.bezig.set(false);
    }
  }

  private meldFout(tekst: string) {
    this.melding.set({ soort: 'fout', tekst });
    alert(tekst);
  }
}
