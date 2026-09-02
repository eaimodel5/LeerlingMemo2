import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { parseCsv, headersMatch } from '../utils/csv';

@Component({
  selector: 'app-memo-1',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, CommonModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative print:bg-white">
      <!-- Header Bar -->
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 print:hidden hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Memo TW1 Invullen</h2>
        <div class="flex gap-2">
          <input type="file" accept=".csv" #csvInput class="hidden" (change)="onFileSelected($event)">
          <button type="button" (click)="csvInput.click()" [disabled]="!form.value.klas || isLocked()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm" title="Importeer CSV">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">upload_file</mat-icon> <span class="hidden md:inline">CSV</span>
          </button>
          <button type="button" (click)="resetForm()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition-colors shadow-sm flex items-center gap-1.5" title="Nieuwe memo">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">add</mat-icon> <span class="hidden md:inline">Nieuw</span>
          </button>
          <button type="button" (click)="printPage()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition-colors flex items-center gap-1.5 shadow-sm" title="Afdrukken">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">print</mat-icon> <span class="hidden md:inline">Print</span>
          </button>
          <button type="button" (click)="submitDraft()" class="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md shadow-sm transition-colors ml-2 flex items-center gap-1.5">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">save</mat-icon> <span class="hidden md:inline">Concept</span>
          </button>
          <button type="button" (click)="submitFinal()" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">check_circle</mat-icon> Definitief
          </button>
        </div>
      </header>

      <!-- Print View Header (only visible when printing) -->
      <div class="hidden print:block p-8 border-b-2 border-slate-800 mb-8">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">Emmauscollege Rotterdam</h1>
            <p class="text-lg font-bold text-slate-600">Leerlingmemo TW1 - Schooljaar 2026-2027</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold">TW1</p>
            <p class="text-xs text-slate-500">{{ today | date:'dd-MM-yyyy' }}</p>
          </div>
        </div>
      </div>

      @if (isLocked()) {
        <div class="m-8 mb-0 p-4 bg-red-50 text-red-800 rounded-lg flex items-center gap-3 border border-red-200 animate-in fade-in zoom-in duration-300 print:hidden">
          <mat-icon>lock</mat-icon>
          <div>
            <p class="font-bold">Invoer gesloten</p>
            <p class="text-sm">De mentor heeft de invoer voor deze klas in deze periode gesloten. Je kunt geen wijzigingen meer doorvoeren of CSV's importeren.</p>
          </div>
        </div>
      }

      @if (showSuccess()) {
        <div class="m-8 mb-0 p-4 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-3 border border-emerald-200 animate-in fade-in zoom-in duration-300 print:hidden">
          <mat-icon>check_circle</mat-icon>
          <span>Memo is succesvol opgeslagen!</span>
        </div>
      }

      <!-- CSV Preview Modal -->
      @if (csvPreviewData()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div class="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 class="text-xl font-bold text-slate-900">Importeer Excel (CSV)</h3>
                <p class="text-sm text-slate-600 mt-1">Controleer de data voordat je deze opslaat. Bestaande memo's voor dezelfde leerling/vak combinatie worden overschreven.</p>
              </div>
              <button (click)="cancelImport()" class="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="flex-1 overflow-auto p-0">
              <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-slate-100 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th class="px-4 py-3 border-b border-slate-200">Lln Nr</th>
                    <th class="px-4 py-3 border-b border-slate-200">Naam</th>
                    <th class="px-4 py-3 border-b border-slate-200">Vak</th>
                    <th class="px-4 py-3 border-b border-slate-200">Aandachtspunten</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (row of csvPreviewData(); track row.leerlingnummer + row.vak) {
                    <tr class="hover:bg-slate-50">
                      <td class="px-4 py-3 text-slate-600">{{ row.leerlingnummer }}</td>
                      <td class="px-4 py-3 font-medium text-slate-900">{{ row.leerling }}</td>
                      <td class="px-4 py-3 text-blue-600 font-medium">{{ row.vak }}</td>
                      <td class="px-4 py-3 text-slate-500 truncate max-w-xs">{{ row.aandachtspuntenRaw }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <div class="text-sm font-medium text-slate-600">
                Totaal te importeren: <span class="font-bold text-slate-900">{{ csvPreviewData()?.length }} memo's</span>
              </div>
              <div class="flex gap-3">
                <button (click)="cancelImport()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors">Annuleren</button>
                <button (click)="confirmImport()" class="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-2">
                  <mat-icon class="text-[18px]">save</mat-icon>
                  Bevestig & Opslaan
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Form Content -->
      <form [formGroup]="form" class="flex-1 p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:p-0">
        
        <!-- Left Column: Selection & Checkboxes -->
        <div class="lg:col-span-4 flex flex-col gap-6 print:mb-8">
          <section class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
            <h3 class="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wide print:text-slate-800">Basis Informatie</h3>
            <div class="space-y-4">
              <div class="print:grid print:grid-cols-2 print:gap-4 print:space-y-0">
                <div class="print:mb-4">
                  <label for="klas-select" class="block text-xs font-semibold text-slate-600 mb-1">Klas *</label>
                  <select id="klas-select" formControlName="klas" (change)="onKlasChange()" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none print:bg-white">
                    <option value="">-- Kies Klas --</option>
                    @for (k of availableKlassen(); track k) {
                      <option [value]="k">{{k}}</option>
                    }
                  </select>
                </div>
              </div>

              <div class="print:grid print:grid-cols-2 print:gap-4 print:space-y-0">
                <div class="print:mb-4">
                  <label for="leerling-select" class="block text-xs font-semibold text-slate-600 mb-1">Leerling *</label>
                  <select id="leerling-select" formControlName="leerlingId" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none print:bg-white" [attr.disabled]="!form.value.klas ? true : null" [class.bg-slate-100]="!form.value.klas">
                    <option value="">-- Kies Leerling --</option>
                    @for (l of filteredLeerlingen(); track l.id) {
                      <option [value]="l.id">{{l.leerling}} ({{l.leerlingnummer}})</option>
                    }
                  </select>
                </div>
                <div class="print:mb-4">
                  <label for="docent-vak-select" class="block text-xs font-semibold text-slate-600 mb-1">Vak / Docent *</label>
                  <select id="docent-vak-select" formControlName="docentVakId" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none print:bg-white" [attr.disabled]="!form.value.klas ? true : null" [class.bg-slate-100]="!form.value.klas">
                    <option value="">-- Kies Docent/Vak --</option>
                    @for (dv of filteredDocentVakken(); track dv.id) {
                      <option [value]="dv.id">{{dv.vak}} - {{dv.docentNaam}}</option>
                    }
                    <option value="custom">-- Anders, zelf invullen --</option>
                  </select>
                </div>
              </div>
              
              @if (form.value.docentVakId === 'custom') {
                <div class="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded print:bg-white print:border-slate-300">
                  <input type="text" formControlName="customDocentNaam" placeholder="Naam docent (bijv. B. Janssen)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  <input type="text" formControlName="customVak" placeholder="Vak (bijv. Wiskunde)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
              }

              @if (false) {
                <div class="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg print:bg-white print:border-slate-300">
                  <h4 class="text-xs font-bold text-blue-800 uppercase mb-2">Mentor Afspraken TW1</h4>
                  <p class="text-xs text-blue-900 whitespace-pre-wrap">{{ previousMentorInfo()?.centraleBespreekvragen }}</p>
                </div>
              }
            </div>
          </section>

          <section class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1 print:border-slate-300 print:shadow-none print:mt-4">
            <h3 class="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wide print:text-slate-800">Aandachtspunten</h3>
            <div class="space-y-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 print:grid-cols-3">
              <label class="flex items-center text-sm cursor-pointer">
                <input type="checkbox" formControlName="aandachtInhoudelijkBegrip" class="rounded border-slate-300 text-blue-600 w-4 h-4 mr-3 focus:ring-blue-500 cursor-pointer print:border-slate-800">
                Inhoudelijk begrip
              </label>
              <label class="flex items-center text-sm cursor-pointer">
                <input type="checkbox" formControlName="aandachtPlanningOrganisatie" class="rounded border-slate-300 text-blue-600 w-4 h-4 mr-3 focus:ring-blue-500 cursor-pointer print:border-slate-800">
                Planning / organisatie
              </label>
              <label class="flex items-center text-sm cursor-pointer">
                <input type="checkbox" formControlName="aandachtToetsvoorbereidingLeerstrategie" class="rounded border-slate-300 text-blue-600 w-4 h-4 mr-3 focus:ring-blue-500 cursor-pointer print:border-slate-800">
                Toetsvoorbereiding
              </label>
              <label class="flex items-center text-sm cursor-pointer">
                <input type="checkbox" formControlName="aandachtInzetWerkhouding" class="rounded border-slate-300 text-blue-600 w-4 h-4 mr-3 focus:ring-blue-500 cursor-pointer print:border-slate-800">
                Inzet / werkhouding
              </label>
              <label class="flex items-center text-sm cursor-pointer">
                <input type="checkbox" formControlName="aandachtWerkNietOpOrde" class="rounded border-slate-300 text-blue-600 w-4 h-4 mr-3 focus:ring-blue-500 cursor-pointer print:border-slate-800">
                Werk niet op orde
              </label>
              <label class="flex items-center text-sm cursor-pointer">
                <input type="checkbox" formControlName="aandachtAanwezigheidVerzuim" class="rounded border-slate-300 text-blue-600 w-4 h-4 mr-3 focus:ring-blue-500 cursor-pointer print:border-slate-800">
                Aanwezigheid / verzuim
              </label>
            </div>
          </section>
        </div>

        <!-- Right Column: Text Inputs -->
        <div class="lg:col-span-8 flex flex-col gap-4 print:block">
          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:mb-4">
            <label for="waar-textarea" class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Waar zie je dit concreet aan? *</label>
            <textarea id="waar-textarea" formControlName="waarZieJeDitAan" class="w-full h-24 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0" placeholder="Beschrijf waarnemingen in de les en bij toetsresultaten..."></textarea>
          </div>

          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:mb-4">
            <label for="wel-textarea" class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Wat werkt wél bij deze leerling?</label>
            <textarea id="wel-textarea" formControlName="watWerktWel" class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0" placeholder="Bijv. directe feedback, extra uitleg aan het begin..."></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-1 print:gap-4 print:mb-4">
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col print:shadow-none print:border-slate-300">
              <label for="leerling-actie-textarea" class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Actie Leerling *</label>
              <textarea id="leerling-actie-textarea" formControlName="leerlingActie" class="w-full flex-1 min-h-[7rem] p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y print:h-auto print:border-0 print:p-0" placeholder="Wat moet de leerling doen?"></textarea>
            </div>
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col print:shadow-none print:border-slate-300">
              <label for="docent-actie-textarea" class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Actie Docent *</label>
              <textarea id="docent-actie-textarea" formControlName="docentActie" class="w-full flex-1 min-h-[7rem] p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y print:h-auto print:border-0 print:p-0" placeholder="Wat doe jij als ondersteuning?"></textarea>
            </div>
          </div>

          @if (false) {
             <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:mb-4">
               <label for="reflectie-textarea" class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Reflectie op afspraken TW1</label>
               <textarea id="reflectie-textarea" formControlName="reflectieOpVorigePeriode" class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0" placeholder="Hoe is het gegaan met de afspraken uit TW1?"></textarea>
             </div>
          }

          <div class="bg-slate-100 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between border border-slate-200 gap-4 mt-auto print:bg-white print:border-slate-300 print:mt-4">
             <div class="flex items-center">
               <span class="text-xs font-bold text-slate-500 uppercase mr-4 print:text-slate-800">EMC:</span>
               <div class="flex gap-2">
                 <button type="button" (click)="form.patchValue({emc: 'Nee'})" [class.bg-white]="form.value.emc !== 'Nee'" [class.bg-slate-700]="form.value.emc === 'Nee'" [class.text-white]="form.value.emc === 'Nee'" [class.text-slate-700]="form.value.emc !== 'Nee'" class="px-4 py-1 text-sm rounded border border-slate-300 font-medium transition-colors print:hidden">Nee</button>
                 <button type="button" (click)="form.patchValue({emc: 'Ja'})" [class.bg-red-100]="form.value.emc !== 'Ja'" [class.bg-red-600]="form.value.emc === 'Ja'" [class.text-white]="form.value.emc === 'Ja'" [class.text-red-700]="form.value.emc !== 'Ja'" [class.border-red-300]="form.value.emc !== 'Ja'" [class.border-red-600]="form.value.emc === 'Ja'" class="px-4 py-1 text-sm rounded border font-bold transition-colors print:hidden">Ja</button>
                 <span class="hidden print:inline font-bold">{{ form.value.emc || 'Nee' }}</span>
               </div>
             </div>
             <div class="flex items-center gap-4">
               <div class="flex items-center">
                 <label for="status-select" class="text-xs font-bold text-slate-500 uppercase mr-3 print:text-slate-800">Status:</label>
                 <select id="status-select" formControlName="status" class="px-3 py-1 bg-yellow-100/50 text-slate-800 text-xs font-bold rounded-full border-0 focus:ring-0 cursor-pointer uppercase print:appearance-none print:p-0 print:bg-transparent">
                   <option value="Concept">Concept</option>
                   <option value="Definitief">Definitief</option>
                 </select>
               </div>
               
               <div class="sm:hidden flex gap-2 print:hidden">
                 <button type="button" (click)="submitFinal()" class="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-sm transition-colors">Opslaan</button>
               </div>
             </div>
          </div>
          
          @if (form.invalid && form.touched) {
            <div class="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200 print:hidden">
              Vul a.u.b. alle verplichte velden (*) in.
            </div>
          }
        </div>
      </form>
    </div>
  `
})
export class Memo1Component {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  showSuccess = signal(false);
  today = new Date();
  taakId = signal<string | null>(null);

  constructor() {
    this.route.queryParams.subscribe(params => {
      if (params['taakId']) this.taakId.set(params['taakId']);
      if (params['klas']) {
        this.form.patchValue({ klas: params['klas'] });
        setTimeout(() => {
          if (params['leerling']) {
            const ll = this.dataService.leerlingen().find(l => l.leerlingnummer === params['leerling']);
            if (ll) this.form.patchValue({ leerlingId: ll.id });
          }
        }, 100);
      }
    });
  }
  
  csvPreviewData = signal<any[] | null>(null);

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length < 1) return;

      const expectedHeaders = ['Leerlingnummer', 'Naam', 'Klas', 'Vak', 'Aandachtspunten', 'Waar zie je dit aan?', 'Wat werkt wel?', 'Actie Leerling (TW1/TW2) / Doorstroom (TW3)', 'Actie Docent'];

      if (!headersMatch(rows[0], expectedHeaders)) {
        alert('Fout: De kolomnamen komen niet overeen met het sjabloon. Gebruik exact het gedownloade sjabloon en pas de titels niet aan.');
        event.target.value = '';
        return;
      }

      const rowsToImport = [];
      for (let i = 1; i < rows.length; i++) {
        // Ontbrekende laatste kolommen aanvullen, zodat een rij waarin de laatste
        // velden leeg zijn gelaten niet stilzwijgend wordt overgeslagen.
        const columns = Array.from({ length: expectedHeaders.length }, (_, c) => rows[i][c] ?? '');

        // Lege regels overslaan: geen vak en geen inhoud.
        if (!columns[3] && !columns[5] && !columns[7] && !columns[8]) continue;

        rowsToImport.push({
          leerlingnummer: columns[0],
          leerling: columns[1],
          klas: columns[2],
          vak: columns[3] || 'Onbekend',
          aandachtspuntenRaw: columns[4] || '',
          waarZieJeDitAan: columns[5] || '',
          watWerktWel: columns[6] || '',
          leerlingActie: columns[7] || '',
          docentActie: columns[8] || ''
        });
      }

      if (rowsToImport.length > 0) {
        this.csvPreviewData.set(rowsToImport);
      } else {
        alert('Geen bruikbare data gevonden in de CSV.');
      }
      
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  cancelImport() {
    this.csvPreviewData.set(null);
  }

  confirmImport() {
    const data = this.csvPreviewData();
    if (!data || this.isLocked()) return;
    
    const schooljaar = this.form.value.schooljaar!;
    const toetsweek = this.form.value.toetsweek as any;
    const aangemaaktDoor = this.authService.currentUser()?.email || 'docent@school.nl';
    
    let successCount = 0;

    data.forEach(row => {
      const dbLln = this.dataService.leerlingen().find(l => l.leerlingnummer === row.leerlingnummer && l.schooljaar === schooljaar);
      if (!dbLln) return;

      const attentionRaw = row.aandachtspuntenRaw.toLowerCase();

      const memoData: any = {
        schooljaar,
        toetsweek,
        leerlingnummer: dbLln.leerlingnummer,
        leerling: dbLln.leerling,
        klas: dbLln.klas,
        docentNaam: this.authService.currentUser()?.name || 'Onbekend',
        docentEmail: aangemaaktDoor,
        vak: row.vak,
        
        aandachtInhoudelijkBegrip: attentionRaw.includes('inhoudelijk'),
        aandachtPlanningOrganisatie: attentionRaw.includes('planning') || attentionRaw.includes('organisatie'),
        aandachtToetsvoorbereidingLeerstrategie: attentionRaw.includes('toetsvoorbereiding') || attentionRaw.includes('leerstrategie'),
        aandachtInzetWerkhouding: attentionRaw.includes('inzet') || attentionRaw.includes('werkhouding'),
        aandachtWerkNietOpOrde: attentionRaw.includes('niet op orde'),
        aandachtAanwezigheidVerzuim: attentionRaw.includes('aanwezigheid') || attentionRaw.includes('verzuim'),

        waarZieJeDitAan: row.waarZieJeDitAan,
        watWerktWel: row.watWerktWel,
        leerlingActie: row.leerlingActie,
        docentActie: row.docentActie,
        emc: 'Nee',
        status: 'Definitief',
        aangemaaktDoor: aangemaaktDoor,
        aangemaaktOp: new Date().toISOString(),
        gewijzigdOp: new Date().toISOString()
      };

      const existing = this.dataService.memoTW1TW2().find(m => m.schooljaar === schooljaar && m.toetsweek === toetsweek && m.leerlingnummer === dbLln.leerlingnummer && m.vak.toLowerCase() === row.vak.toLowerCase());

      if (existing && existing.id) {
        this.dataService.updateMemoTW1TW2(existing.id, memoData);
      } else {
        this.dataService.addMemoTW1TW2(memoData);
      }
      successCount++;
    });

    alert(`${successCount} memo's succesvol geïmporteerd en opgeslagen.`);
    this.csvPreviewData.set(null);
  }

  form = this.fb.group({
    toetsweek: ['TW1'],
    schooljaar: ['2026-2027'],
    klas: ['', Validators.required],
    leerlingId: ['', Validators.required],
    docentVakId: ['', Validators.required],
    customDocentNaam: [''],
    customVak: [''],
    
    aandachtInhoudelijkBegrip: [false],
    aandachtPlanningOrganisatie: [false],
    aandachtToetsvoorbereidingLeerstrategie: [false],
    aandachtInzetWerkhouding: [false],
    aandachtWerkNietOpOrde: [false],
    aandachtAanwezigheidVerzuim: [false],

    waarZieJeDitAan: ['', Validators.required],
    watWerktWel: [''],
    leerlingActie: ['', Validators.required],
    emc: ['Nee' as any],
    docentActie: ['', Validators.required],
    reflectieOpVorigePeriode: [''],
    status: ['Concept', Validators.required]
  });

  availableKlassen = computed(() => {
    const lln = this.dataService.leerlingen().filter(l => l.actief && l.schooljaar === '2026-2027');
    return [...new Set(lln.map(l => l.klas))].sort();
  });

  formValues = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  filteredLeerlingen = computed(() => {
    const klas = this.formValues().klas;
    if (!klas) return [];
    return this.dataService.leerlingen().filter(l => l.actief && l.schooljaar === '2026-2027' && l.klas === klas);
  });

  filteredDocentVakken = computed(() => {
    const klas = this.formValues().klas;
    if (!klas) return [];
    return this.dataService.docentVakken().filter(dv => dv.actief && dv.schooljaar === '2026-2027' && dv.klas === klas);
  });

  isLocked = computed(() => {
    const klas = this.formValues().klas;
    const periode = this.formValues().toetsweek;
    const schooljaar = this.formValues().schooljaar;
    if (!klas || !periode || !schooljaar) return false;
    const lockId = `${klas}_${periode}_${schooljaar}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const lock = this.dataService.classLocks().find(l => l.id === lockId);
    return lock ? lock.isLocked : false;
  });

  previousMentorInfo = computed(() => {
    const leerlingId = this.formValues().leerlingId;
    if (!leerlingId) return null;
    const leerling = this.dataService.leerlingen().find(l => l.id === leerlingId);
    if (!leerling) return null;
    return this.dataService.mentorVoorbereiding().find(m => m.leerlingnummer === leerling.leerlingnummer && m.periode === 'TW1');
  });

  onKlasChange() {
    this.form.patchValue({ leerlingId: '', docentVakId: '' });
  }

  resetForm() {
    this.form.reset({
      schooljaar: '2026-2027',
      status: 'Concept',
      emc: 'Nee',
      aandachtInhoudelijkBegrip: false,
      aandachtPlanningOrganisatie: false,
      aandachtToetsvoorbereidingLeerstrategie: false,
      aandachtInzetWerkhouding: false,
      aandachtWerkNietOpOrde: false,
      aandachtAanwezigheidVerzuim: false,
      customDocentNaam: '',
      customVak: ''
    });
    this.showSuccess.set(false);
  }

  printPage() {
    window.print();
  }

  submitDraft() {
    if (this.isLocked()) return;
    this.form.patchValue({ status: 'Concept' });
    this.onSubmit();
  }

  submitFinal() {
    if (this.isLocked()) return;
    this.form.patchValue({ status: 'Definitief' });
    this.onSubmit();
  }

  private onSubmit() {
    if (this.isLocked()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const leerling = this.filteredLeerlingen().find(l => l.id === val.leerlingId);

    if (!leerling) return;

    let docentNaam = '';
    let docentEmail = '';
    let vak = '';

    if (val.docentVakId === 'custom') {
      docentNaam = val.customDocentNaam || this.authService.currentUser()?.name || 'Onbekend';
      vak = val.customVak || this.authService.currentUser()?.vak || 'Onbekend';
      docentEmail = this.authService.currentUser()?.email || '';
    } else {
      const docentVak = this.filteredDocentVakken().find(dv => dv.id === val.docentVakId);
      if (!docentVak) return;
      docentNaam = docentVak.docentNaam;
      docentEmail = docentVak.docentEmail;
      vak = docentVak.vak;
    }

    const memoData: any = {
      schooljaar: val.schooljaar!,
      toetsweek: val.toetsweek as any,
      leerlingnummer: leerling.leerlingnummer,
      leerling: leerling.leerling,
      klas: leerling.klas,
      docentNaam: docentNaam,
      docentEmail: docentEmail,
      vak: vak,
      
      aandachtInhoudelijkBegrip: !!val.aandachtInhoudelijkBegrip,
      aandachtPlanningOrganisatie: !!val.aandachtPlanningOrganisatie,
      aandachtToetsvoorbereidingLeerstrategie: !!val.aandachtToetsvoorbereidingLeerstrategie,
      aandachtInzetWerkhouding: !!val.aandachtInzetWerkhouding,
      aandachtWerkNietOpOrde: !!val.aandachtWerkNietOpOrde,
      aandachtAanwezigheidVerzuim: !!val.aandachtAanwezigheidVerzuim,

      waarZieJeDitAan: val.waarZieJeDitAan!,
      watWerktWel: val.watWerktWel || '',
      leerlingActie: val.leerlingActie!,
      emc: val.emc as any,
      docentActie: val.docentActie!,
      status: val.status as any,
      aangemaaktDoor: this.authService.currentUser()?.email || docentEmail || 'docent@school.nl',
      aangemaaktOp: new Date().toISOString(),
      gewijzigdOp: new Date().toISOString()
    };

    if (val.reflectieOpVorigePeriode) {
      memoData.reflectieOpVorigePeriode = val.reflectieOpVorigePeriode;
    }

    // Eén memo per leerling/vak/toetsweek/schooljaar: werk een bestaande memo bij
    // in plaats van er een tweede naast te zetten (bijv. eerst Concept, dan Definitief).
    const bestaandeMemo = this.dataService.memoTW1TW2().find(m =>
      m.schooljaar === memoData.schooljaar &&
      m.toetsweek === memoData.toetsweek &&
      m.leerlingnummer === memoData.leerlingnummer &&
      m.vak.toLowerCase() === memoData.vak.toLowerCase()
    );

    if (bestaandeMemo?.id) {
      // Aanmaakgegevens van de oorspronkelijke memo behouden.
      memoData.aangemaaktOp = bestaandeMemo.aangemaaktOp;
      memoData.aangemaaktDoor = bestaandeMemo.aangemaaktDoor;
      this.dataService.updateMemoTW1TW2(bestaandeMemo.id, memoData);
    } else {
      this.dataService.addMemoTW1TW2(memoData);
    }

    if (this.taakId()) {
      const taak = this.dataService.docentTaken().find(t => t.id === this.taakId());
      if (taak) {
        this.dataService.saveDocentTaak({
          ...taak,
          status: 'Ingevuld',
          gewijzigdOp: new Date().toISOString()
        });
      }
    }

    this.showSuccess.set(true);
    setTimeout(() => this.showSuccess.set(false), 5000);
  }
}
