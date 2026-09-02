import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../services/data.service';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { parseCsv, downloadCsv } from '../utils/csv';

@Component({
  selector: 'app-manage-teachers',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Beheer Docenten / Vakken</h2>
        <div class="flex gap-2 mt-2 sm:mt-0 overflow-x-auto">
          <button (click)="fileInput.click()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">upload_file</mat-icon> Importeer CSV
          </button>
          <input type="file" #fileInput class="hidden" accept=".csv" (change)="importCSV($event)">
          <button (click)="downloadTemplate()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">download</mat-icon> Template
          </button>
          <button (click)="deleteAllTeachers()" class="px-3 py-1.5 text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Wis alle docenten">
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
            <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Zoek op docent of vak..." class="w-full pl-10 pr-4 p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
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
               <mat-icon class="text-[18px] w-[18px] h-[18px]">add</mat-icon> Nieuwe Koppeling
             </button>
          </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
          <table class="min-w-full divide-y divide-slate-200">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Docent</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Vak</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Klas</th>
                <th class="px-6 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wide">Status</th>
                <th class="px-6 py-3 text-right text-xs font-bold text-slate-400 uppercase tracking-wide">Acties</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 bg-white">
              @for (dv of filteredDocentVakken(); track dv.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-800">{{dv.docentNaam}}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{{dv.vak}}</td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{{dv.klas}}</td>
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
                  <td colspan="5" class="px-6 py-12 text-center text-slate-500">
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
              
              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Naam Docent *</label>
                <input type="text" formControlName="docentNaam" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-600 mb-1">Docent Email *</label>
                <input type="email" formControlName="docentEmail" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Vak *</label>
                  <input type="text" formControlName="vak" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Klas *</label>
                  <input type="text" formControlName="klas" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
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
  private fb = inject(FormBuilder);

  searchQuery = signal('');
  filterKlas = signal('');
  showForm = signal(false);
  editingId = signal<string | null>(null);

  form = this.fb.group({
    docentNaam: ['', Validators.required],
    docentEmail: ['', [Validators.required, Validators.email]],
    vak: ['', Validators.required],
    klas: ['', Validators.required],
    schooljaar: ['2026-2027'],
    actief: [true]
  });

  availableKlassen = computed(() => {
    const lln = this.dataService.docentVakken().filter(l => l.schooljaar === '2026-2027');
    return [...new Set(lln.map(l => l.klas))].sort();
  });

  filteredDocentVakken = computed(() => {
    let result = this.dataService.docentVakken().filter(l => l.schooljaar === '2026-2027');
    
    if (this.filterKlas()) {
      result = result.filter(l => l.klas === this.filterKlas());
    }
    
    if (this.searchQuery()) {
      const q = this.searchQuery().toLowerCase();
      result = result.filter(l => 
        l.docentNaam.toLowerCase().includes(q) || 
        l.vak.toLowerCase().includes(q)
      );
    }
    return result;
  });

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

      const headers = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
      const schooljaar = '2026-2027';

      let nieuw = 0;
      let bijgewerkt = 0;
      let overgeslagen = 0;
      let mislukt = 0;

      // Binnen één bestand kan dezelfde combinatie twee keer voorkomen. De signal
      // met bestaande koppelingen loopt achter op wat we zojuist hebben weggeschreven,
      // dus houden we de verwerkte combinaties hier ook bij.
      const inDitBestand = new Set<string>();

      for (let i = 1; i < rows.length; i++) {
        const values = rows[i];
        const obj: Record<string, string> = {};
        headers.forEach((h, index) => { obj[h] = values[index] ?? ''; });

        const docentNaam = obj['docentnaam'] || obj['docent'] || obj['naam'];
        const docentEmail = obj['docentemail'] || obj['email'] || '';
        const vak = obj['vak'] || obj['vaknaam'];
        const klas = obj['klas'] || obj['groep'];

        if (!docentNaam || !vak || !klas) { overgeslagen++; continue; }

        const sleutel = `${(docentEmail || docentNaam).toLowerCase()}|${vak.toLowerCase()}|${klas.toLowerCase()}`;
        if (inDitBestand.has(sleutel)) { overgeslagen++; continue; }
        inDitBestand.add(sleutel);

        const item = {
          docentNaam: docentNaam,
          docentEmail: docentEmail,
          vak: vak,
          klas: klas,
          schooljaar: schooljaar,
          actief: obj['actief'] !== 'false' && obj['actief'] !== '0'
        };

        // Ontdubbelen: één koppeling per docent, vak, klas en schooljaar. Zonder deze
        // controle verdubbelde de lijst bij elke herhaalde import.
        const bestaand = this.dataService.docentVakken().find(dv =>
          dv.schooljaar === schooljaar &&
          dv.klas.toLowerCase() === klas.toLowerCase() &&
          dv.vak.toLowerCase() === vak.toLowerCase() &&
          (docentEmail
            ? dv.docentEmail.toLowerCase() === docentEmail.toLowerCase()
            : dv.docentNaam.toLowerCase() === docentNaam.toLowerCase())
        );

        try {
          if (bestaand?.id) {
            await this.dataService.updateDocentVak(bestaand.id, item);
            bijgewerkt++;
          } else {
            await this.dataService.addDocentVak(item);
            nieuw++;
          }
        } catch {
          mislukt++;
        }
      }

      const delen = [`${nieuw} nieuw`, `${bijgewerkt} bijgewerkt`];
      if (overgeslagen) delen.push(`${overgeslagen} overgeslagen`);
      if (mislukt) delen.push(`${mislukt} mislukt`);
      alert('Import klaar: ' + delen.join(', ') + '.');

      input.value = '';
    };
    reader.readAsText(file);
  }

  downloadTemplate() {
    downloadCsv('docenten_vakken_template.csv', [
      ['docentNaam', 'docentEmail', 'vak', 'klas', 'schooljaar', 'actief'],
      ['J. de Vries', 'jdevries@emmauscollege.nl', 'Wiskunde', '2HJ', '2026-2027', 'true']
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

  deleteAllTeachers() {
    if (confirm('Weet je zeker dat je ALLE docenten in deze lijst wilt verwijderen? Dit kan niet ongedaan worden gemaakt.')) {
      const teachers = this.filteredDocentVakken();
      for (const t of teachers) {
        if (t.id) {
          this.dataService.deleteDocentVak(t.id);
        }
      }
      alert(`${teachers.length} docent-koppelingen succesvol verwijderd.`);
    }
  }

  toggleActive(item: any) {
    this.dataService.updateDocentVak(item.id, { actief: !item.actief });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    const val = this.form.value as any;
    const id = this.editingId();
    
    if (id) {
      this.dataService.updateDocentVak(id, val);
    } else {
      this.dataService.addDocentVak(val);
    }
    
    this.closeForm();
  }
}
