import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { parseCsv, headersMatch } from '../utils/csv';
import { filterVoorDocent, komtDocentOvereen, bouwDocentIdentiteitVelden } from '../utils/docent-identiteit';
import { wachtOpOpslag, Melding, MELDING_BEVESTIGD, MELDING_WACHT, meldingBijFout } from '../utils/opslag';

@Component({
  selector: 'app-memo-3',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, CommonModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative print:bg-white">
      <!-- Header Bar -->
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 print:hidden hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Memo TW3 Invullen</h2>
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
          <button type="button" (click)="submitDraft()" [disabled]="bezig()" class="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md shadow-sm transition-colors ml-2 flex items-center gap-1.5">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">save</mat-icon> <span class="hidden md:inline">Concept</span>
          </button>
          <button type="button" (click)="submitFinal()" [disabled]="bezig()" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">check_circle</mat-icon> Definitief
          </button>
        </div>
      </header>

      <!-- Print View Header -->
      <div class="hidden print:block p-8 border-b-2 border-slate-800 mb-8">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">Emmauscollege Rotterdam</h1>
            <p class="text-lg font-bold text-slate-600">Leerlingmemo TW3 - Schooljaar 2026-2027</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold">TW3</p>
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

      @if (melding(); as m) {
        <div class="m-8 mb-0 p-4 rounded-lg flex items-start gap-3 border animate-in fade-in zoom-in duration-300 print:hidden"
             [class.bg-emerald-50]="m.soort === 'ok'" [class.text-emerald-800]="m.soort === 'ok'" [class.border-emerald-200]="m.soort === 'ok'"
             [class.bg-amber-50]="m.soort === 'wacht'" [class.text-amber-900]="m.soort === 'wacht'" [class.border-amber-200]="m.soort === 'wacht'"
             [class.bg-red-50]="m.soort === 'fout'" [class.text-red-800]="m.soort === 'fout'" [class.border-red-200]="m.soort === 'fout'">
          <mat-icon [class.text-emerald-500]="m.soort === 'ok'" [class.text-amber-500]="m.soort === 'wacht'" [class.text-red-500]="m.soort === 'fout'">
            {{ m.soort === 'ok' ? 'check_circle' : m.soort === 'wacht' ? 'cloud_upload' : 'error' }}
          </mat-icon>
          <div>
            <p class="font-bold">{{ m.soort === 'ok' ? 'Opgeslagen' : m.soort === 'wacht' ? 'Nog niet bevestigd' : 'Niet opgeslagen' }}</p>
            <p class="text-sm">{{ m.tekst }}</p>
          </div>
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

      <form [formGroup]="form" class="flex-1 p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 print:block print:p-0">
        
        <div class="lg:col-span-4 flex flex-col gap-6 print:mb-8">
          <section class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300">
            <h3 class="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wide print:text-slate-800">Basis Informatie</h3>
            <div class="space-y-4">
              <div class="print:grid print:grid-cols-2 print:gap-4 print:space-y-0">
                <div class="print:mb-4">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Toetsweek</label>
                  <input type="text" formControlName="toetsweek" readonly class="w-full p-2 text-sm border border-slate-300 bg-slate-100 text-slate-500 rounded cursor-not-allowed outline-none print:bg-white">
                </div>
                <div class="print:mb-4">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Klas *</label>
                  <select formControlName="klas" (change)="onKlasChange()" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                    <option value="">-- Kies Klas --</option>
                    @for (k of availableKlassen(); track k) {
                      <option [value]="k">{{k}}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="print:grid print:grid-cols-2 print:gap-4 print:space-y-0">
                <div class="print:mb-4">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Leerling *</label>
                  <select formControlName="leerlingId" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" [attr.disabled]="!form.value.klas ? true : null" [class.bg-slate-100]="!form.value.klas">
                    <option value="">-- Kies Leerling --</option>
                    @for (l of filteredLeerlingen(); track l.id) {
                      <option [value]="l.id">{{l.leerling}} ({{l.leerlingnummer}})</option>
                    }
                  </select>
                </div>
                <div class="print:mb-4">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Vak / Docent *</label>
                  <select formControlName="docentVakId" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-2" [attr.disabled]="!form.value.klas ? true : null" [class.bg-slate-100]="!form.value.klas">
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

              @if (previousMentorInfoTW1()) {
                <div class="p-3 bg-blue-50 border border-blue-100 rounded-lg print:bg-white print:border-slate-300">
                  <h4 class="text-xs font-bold text-blue-800 uppercase mb-2">Mentor Afspraken TW1</h4>
                  <p class="text-xs text-blue-900 whitespace-pre-wrap">{{ previousMentorInfoTW1()?.centraleBespreekvragen }}</p>
                </div>
              }
              @if (previousMentorInfoTW2()) {
                <div class="p-3 bg-emerald-50 border border-emerald-100 rounded-lg print:bg-white print:border-slate-300">
                  <h4 class="text-xs font-bold text-emerald-800 uppercase mb-2">Mentor Afspraken TW2</h4>
                  <p class="text-xs text-emerald-900 whitespace-pre-wrap">{{ previousMentorInfoTW2()?.centraleBespreekvragen }}</p>
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

        <div class="lg:col-span-8 flex flex-col gap-4 print:block">
          @if (bestaandeMemo(); as bm) {
            <div class="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-blue-900 text-xs shadow-sm print:hidden">
              <div class="flex items-center gap-2">
                <mat-icon class="text-blue-600 text-[20px] w-[20px] h-[20px]">history_edu</mat-icon>
                <div>
                  <span class="font-bold">Bestaande memo geladen:</span>
                  <span class="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border"
                        [class.bg-emerald-100]="bm.status === 'Definitief'"
                        [class.text-emerald-800]="bm.status === 'Definitief'"
                        [class.border-emerald-300]="bm.status === 'Definitief'"
                        [class.bg-yellow-100]="bm.status === 'Concept'"
                        [class.text-yellow-800]="bm.status === 'Concept'"
                        [class.border-yellow-300]="bm.status === 'Concept'">
                    {{ bm.status }}
                  </span>
                  <span class="ml-2 text-slate-500">Laatst opgeslagen door {{ bm.gewijzigdDoor || bm.docentNaam }}</span>
                </div>
              </div>
            </div>
          } @else if (form.value.leerlingId && form.value.docentVakId) {
            <div class="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-600 text-xs print:hidden">
              <mat-icon class="text-slate-500 text-[18px] w-[18px] h-[18px]">add_circle_outline</mat-icon>
              <span>Nieuwe memo voor deze leerling en dit vak.</span>
            </div>
          }

          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:mb-4">
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Waar zie je dit concreet aan? *</label>
            <textarea formControlName="waarZieJeDitAan" class="w-full h-24 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0" placeholder="Beschrijf de situatie..."></textarea>
          </div>

          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:mb-4">
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Wat werkt wél bij deze leerling?</label>
            <textarea formControlName="watWerktWel" class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0" placeholder="Positieve punten..."></textarea>
          </div>

          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col print:shadow-none print:border-slate-300 print:mb-4">
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Doorstroomtoelichting *</label>
            <textarea formControlName="doorstroomToelichting" class="w-full flex-1 min-h-[7rem] p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y print:h-auto print:border-0 print:p-0" placeholder="Licht toe..."></textarea>
          </div>

          <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:mb-4">
            <label class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Reflectie op eerdere afspraken</label>
            <textarea formControlName="reflectieOpVorigePeriode" class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0" placeholder="Reflectie op TW1/TW2..."></textarea>
          </div>

          <div class="bg-slate-100 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between border border-slate-200 gap-4 mt-auto print:bg-white print:border-slate-300 print:mt-4">
             <div class="flex items-center gap-4 w-full justify-between">
               <div class="flex items-center">
                 <span class="text-xs font-bold text-slate-500 uppercase mr-3 print:text-slate-800">Status:</span>
                 <select formControlName="status" class="px-3 py-1 bg-yellow-100/50 text-slate-800 text-xs font-bold rounded-full border-0 focus:ring-0 cursor-pointer uppercase print:appearance-none print:p-0">
                   <option value="Concept">Concept</option>
                   <option value="Definitief">Definitief</option>
                 </select>
               </div>
               
               <div class="sm:hidden flex gap-2 print:hidden">
                 <button type="button" (click)="submitFinal()" [disabled]="form.invalid" class="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Opslaan</button>
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
export class Memo3Component {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);

  melding = signal<Melding | null>(null);
  bezig = signal(false);
  today = new Date();
  taakId = signal<string | null>(null);

  laatstGeladenSleutel: string | null = null;

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

    // Zodra leerling en docent/vak geselecteerd zijn: als er al een memo bestaat,
    // vul het formulier in zodat de docent zijn opgeslagen werk direct ziet en kan wijzigen.
    // Is er geen bestaande memo, dan wordt het formulier leeggemaakt voor een schone invoer.
    effect(() => {
      const memo = this.bestaandeMemo();
      const vals = this.formValues();
      const leerlingId = vals.leerlingId;
      const docentVakId = vals.docentVakId;

      if (!leerlingId || !docentVakId) return;

      const sleutel = `${leerlingId}|${docentVakId}|${memo?.id ?? 'nieuw'}`;
      if (sleutel === this.laatstGeladenSleutel) return;
      this.laatstGeladenSleutel = sleutel;

      if (memo) {
        this.form.patchValue({
          aandachtInhoudelijkBegrip: !!memo.aandachtInhoudelijkBegrip,
          aandachtPlanningOrganisatie: !!memo.aandachtPlanningOrganisatie,
          aandachtToetsvoorbereidingLeerstrategie: !!memo.aandachtToetsvoorbereidingLeerstrategie,
          aandachtInzetWerkhouding: !!memo.aandachtInzetWerkhouding,
          aandachtWerkNietOpOrde: !!memo.aandachtWerkNietOpOrde,
          aandachtAanwezigheidVerzuim: !!memo.aandachtAanwezigheidVerzuim,
          waarZieJeDitAan: memo.waarZieJeDitAan || '',
          watWerktWel: memo.watWerktWel || '',
          doorstroomToelichting: memo.doorstroomToelichting || '',
          status: memo.status || 'Concept',
          reflectieOpVorigePeriode: memo.reflectieOpVorigePeriode || ''
        }, { emitEvent: false });
      } else {
        this.form.patchValue({
          aandachtInhoudelijkBegrip: false,
          aandachtPlanningOrganisatie: false,
          aandachtToetsvoorbereidingLeerstrategie: false,
          aandachtInzetWerkhouding: false,
          aandachtWerkNietOpOrde: false,
          aandachtAanwezigheidVerzuim: false,
          waarZieJeDitAan: '',
          watWerktWel: '',
          doorstroomToelichting: '',
          status: 'Concept',
          reflectieOpVorigePeriode: ''
        }, { emitEvent: false });
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
          doorstroomToelichting: columns[7] || '',
          docentActie: columns[8] || '' // Though not strictly required in TW3 form, might be in CSV
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

  async confirmImport() {
    const data = this.csvPreviewData();
    if (!data || this.isLocked()) return;
    
    const schooljaar = this.form.value.schooljaar!;
    const aangemaaktDoor = this.authService.currentUser()?.email || 'docent@school.nl';
    
    let successCount = 0;

    let mislukt = 0;

    for (const row of data) {
      const dbLln = this.dataService.leerlingen().find(l => l.leerlingnummer === row.leerlingnummer && l.schooljaar === schooljaar);
      if (!dbLln) continue;

      const attentionRaw = row.aandachtspuntenRaw.toLowerCase();

      const memoData: any = {
        schooljaar,
        toetsweek: 'TW3',
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
        doorstroomToelichting: row.doorstroomToelichting,
        status: 'Definitief',
        aangemaaktDoor: aangemaaktDoor,
        aangemaaktOp: new Date().toISOString(),
        gewijzigdOp: new Date().toISOString()
      };

      const existing = this.dataService.memoTW3().find(m => m.schooljaar === schooljaar && m.leerlingnummer === dbLln.leerlingnummer && m.vak.toLowerCase() === row.vak.toLowerCase());

      try {
        if (existing && existing.id) {
          await this.dataService.updateMemoTW3(existing.id, memoData);
        } else {
          await this.dataService.addMemoTW3(memoData);
        }
        successCount++;
      } catch {
        mislukt++;
      }
    }

    alert(mislukt === 0
      ? `${successCount} memo's geïmporteerd en opgeslagen.`
      : `${successCount} memo's opgeslagen, ${mislukt} mislukt. Probeer de mislukte regels opnieuw.`);
    this.csvPreviewData.set(null);
  }

  form = this.fb.group({
    toetsweek: ['TW3'],
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
    doorstroomToelichting: ['', Validators.required],
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
    const alle = this.dataService.docentVakken().filter(dv => dv.actief && dv.schooljaar === '2026-2027' && dv.klas === klas);

    // Een vakdocent ziet alleen zijn eigen koppelingen. Hij kon eerder elke
    // collega uit de lijst kiezen en dus een memo op andermans naam schrijven.
    // Mentor, coordinator en beheerder houden het volledige overzicht.
    const gebruiker = this.authService.currentUser();
    if (gebruiker?.role === 'Docent') {
      const eigen = filterVoorDocent(alle, gebruiker);
      // Geen koppeling gevonden: niet blokkeren, wel uitleggen (zie nietGekoppeld).
      return eigen.length > 0 ? eigen : alle;
    }
    return alle;
  });

  /**
   * Waar de docent geen enkele koppeling heeft in deze klas. Dan tonen we de
   * volledige lijst, maar met een waarschuwing - anders schrijft hij ongemerkt
   * een memo op naam van een collega.
   */
  nietGekoppeld = computed(() => {
    const gebruiker = this.authService.currentUser();
    if (gebruiker?.role !== 'Docent') return false;
    const klas = this.formValues().klas;
    if (!klas) return false;
    return !this.dataService.docentVakken().some(dv =>
      dv.actief && dv.schooljaar === '2026-2027' && dv.klas === klas && komtDocentOvereen(dv, gebruiker));
  });

  bestaandeMemo = computed(() => {
    const vals = this.formValues();
    const leerlingId = vals.leerlingId;
    const docentVakId = vals.docentVakId;
    if (!leerlingId || !docentVakId) return null;

    const leerling = this.dataService.leerlingen().find(l => l.id === leerlingId);
    if (!leerling) return null;

    let docentEmail = '';
    let docentNaam = '';
    let docentAfkorting = '';
    let vak = '';

    if (docentVakId === 'custom') {
      docentNaam = vals.customDocentNaam || this.authService.currentUser()?.name || '';
      vak = vals.customVak || this.authService.currentUser()?.vak || '';
      docentEmail = this.authService.currentUser()?.email || '';
      docentAfkorting = this.authService.currentUser()?.docentAfkorting || '';
    } else {
      const dv = this.dataService.docentVakken().find(d => d.id === docentVakId);
      if (!dv) return null;
      docentNaam = dv.docentNaam;
      docentEmail = dv.docentEmail;
      docentAfkorting = dv.docentAfkorting || '';
      vak = dv.vak;
    }

    if (!vak) return null;

    const doelDocent = { docentEmail, docentAfkorting };
    const zelfdeDocent = (m: { docentEmail?: string; docentNaam?: string; docentAfkorting?: string }) =>
      komtDocentOvereen(m, doelDocent);

    return this.dataService.memoTW3().find(m =>
      m.schooljaar === (vals.schooljaar || '2026-2027') &&
      m.leerlingnummer === leerling.leerlingnummer &&
      m.vak.trim().toLowerCase() === vak.trim().toLowerCase() &&
      zelfdeDocent(m)
    ) ?? null;
  });

  isLocked = computed(() => {
    const klas = this.formValues().klas;
    const periode = 'TW3';
    const schooljaar = this.formValues().schooljaar;
    if (!klas || !schooljaar) return false;
    const lockId = `${klas}_${periode}_${schooljaar}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const lock = this.dataService.classLocks().find(l => l.id === lockId);
    return lock ? lock.isLocked : false;
  });

  previousMentorInfoTW1 = computed(() => {
    const leerlingId = this.formValues().leerlingId;
    if (!leerlingId) return null;
    const leerling = this.dataService.leerlingen().find(l => l.id === leerlingId);
    if (!leerling) return null;
    return this.dataService.mentorVoorbereiding().find(m => m.leerlingnummer === leerling.leerlingnummer && m.periode === 'TW1');
  });

  previousMentorInfoTW2 = computed(() => {
    const leerlingId = this.formValues().leerlingId;
    if (!leerlingId) return null;
    const leerling = this.dataService.leerlingen().find(l => l.id === leerlingId);
    if (!leerling) return null;
    return this.dataService.mentorVoorbereiding().find(m => m.leerlingnummer === leerling.leerlingnummer && m.periode === 'TW2');
  });

  onKlasChange() {
    this.form.patchValue({ leerlingId: '', docentVakId: '' });
  }

  resetForm() {
    this.form.reset({
      toetsweek: 'TW3',
      schooljaar: '2026-2027',
      status: 'Concept',
      aandachtInhoudelijkBegrip: false,
      aandachtPlanningOrganisatie: false,
      aandachtToetsvoorbereidingLeerstrategie: false,
      aandachtInzetWerkhouding: false,
      aandachtWerkNietOpOrde: false,
      aandachtAanwezigheidVerzuim: false,
      customDocentNaam: '',
      customVak: ''
    });
    this.melding.set(null);
  }

  printPage() {
    window.print();
  }

  async submitDraft() {
    if (this.isLocked()) return;
    this.form.patchValue({ status: 'Concept' });
    await this.onSubmit();
  }

  async submitFinal() {
    if (this.isLocked()) return;
    this.form.patchValue({ status: 'Definitief' });
    await this.onSubmit();
  }

  private async onSubmit() {
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
    let docentAfkorting = '';
    let vak = '';

    if (val.docentVakId === 'custom') {
      docentNaam = val.customDocentNaam || this.authService.currentUser()?.name || 'Onbekend';
      vak = val.customVak || this.authService.currentUser()?.vak || 'Onbekend';
      docentEmail = this.authService.currentUser()?.email || '';
      docentAfkorting = this.authService.currentUser()?.docentAfkorting || '';
    } else {
      const docentVak = this.filteredDocentVakken().find(dv => dv.id === val.docentVakId);
      if (!docentVak) return;
      docentNaam = docentVak.docentNaam;
      docentEmail = docentVak.docentEmail;
      docentAfkorting = docentVak.docentAfkorting || '';
      vak = docentVak.vak;
    }

    const idVelden = bouwDocentIdentiteitVelden({
      docentAfkorting: docentAfkorting || this.authService.currentUser()?.docentAfkorting,
      docentEmail: docentEmail || this.authService.currentUser()?.email,
    });

    const memoData: any = {
      schooljaar: val.schooljaar!,
      toetsweek: 'TW3',
      leerlingnummer: leerling.leerlingnummer,
      leerling: leerling.leerling,
      klas: leerling.klas,
      docentNaam: docentNaam,
      docentEmail: idVelden.docentEmail,
      ...(idVelden.docentAfkorting ? { docentAfkorting: idVelden.docentAfkorting } : {}),
      vak: vak,
      
      aandachtInhoudelijkBegrip: !!val.aandachtInhoudelijkBegrip,
      aandachtPlanningOrganisatie: !!val.aandachtPlanningOrganisatie,
      aandachtToetsvoorbereidingLeerstrategie: !!val.aandachtToetsvoorbereidingLeerstrategie,
      aandachtInzetWerkhouding: !!val.aandachtInzetWerkhouding,
      aandachtWerkNietOpOrde: !!val.aandachtWerkNietOpOrde,
      aandachtAanwezigheidVerzuim: !!val.aandachtAanwezigheidVerzuim,

      waarZieJeDitAan: val.waarZieJeDitAan!,
      watWerktWel: val.watWerktWel || '',
      doorstroomToelichting: val.doorstroomToelichting!,
      status: val.status as any,
      aangemaaktDoor: this.authService.currentUser()?.email || idVelden.docentEmail || 'docent@school.nl',
      aangemaaktOp: new Date().toISOString(),
      gewijzigdOp: new Date().toISOString(),
      gewijzigdDoor: this.authService.currentUser()?.email || idVelden.docentEmail || ''
    };

    if (val.reflectieOpVorigePeriode) {
      memoData.reflectieOpVorigePeriode = val.reflectieOpVorigePeriode;
    }

    // Eén memo per leerling/vak/schooljaar: werk een bestaande memo bij
    // in plaats van er een tweede naast te zetten (bijv. eerst Concept, dan Definitief).
    // De docent hoort in de sleutel. Zonder hem overschreven twee docenten die
    // hetzelfde vak aan dezelfde leerling geven elkaars memo.
    const doelDocent = { docentEmail: idVelden.docentEmail, docentAfkorting: idVelden.docentAfkorting };
    const zelfdeDocent = (m: { docentEmail?: string; docentNaam?: string; docentAfkorting?: string }) =>
      komtDocentOvereen(m, doelDocent);

    const bestaandeMemo = this.dataService.memoTW3().find(m =>
      m.schooljaar === memoData.schooljaar &&
      m.leerlingnummer === memoData.leerlingnummer &&
      m.vak.toLowerCase() === memoData.vak.toLowerCase() &&
      zelfdeDocent(m)
    );

    // Wachten op de opslag voordat we succes melden. Eerder verscheen de groene
    // melding altijd, ook als de schrijfactie mislukte - de fout verdween dan
    // ongezien als onafgevangen belofte in de console.
    this.bezig.set(true);
    this.melding.set(null);
    try {
      if (bestaandeMemo?.id) {
        // Aanmaakgegevens van de oorspronkelijke memo behouden.
        memoData.aangemaaktOp = bestaandeMemo.aangemaaktOp;
        memoData.aangemaaktDoor = bestaandeMemo.aangemaaktDoor;
      }

      const opslaan = bestaandeMemo?.id
        ? this.dataService.updateMemoTW3(bestaandeMemo.id, memoData)
        : this.dataService.addMemoTW3(memoData);

      const uitkomst = await wachtOpOpslag(opslaan);

      const passendeTaak = this.taakId()
        ? this.dataService.docentTaken().find(t => t.id === this.taakId())
        : this.dataService.docentTaken().find(t =>
            t.leerlingnummer === memoData.leerlingnummer &&
            t.periode === 'TW3' &&
            t.schooljaar === memoData.schooljaar &&
            t.vak.trim().toLowerCase() === memoData.vak.trim().toLowerCase() &&
            komtDocentOvereen(t, doelDocent)
          );

      if (passendeTaak?.id) {
        await wachtOpOpslag(this.dataService.saveDocentTaak({
          ...passendeTaak,
          status: 'Ingevuld',
          gewijzigdOp: new Date().toISOString()
        }));
      }

      if (uitkomst === 'bevestigd') {
        this.melding.set(MELDING_BEVESTIGD('Memo'));
        setTimeout(() => { if (this.melding()?.soort === 'ok') this.melding.set(null); }, 5000);
      } else {
        this.melding.set(MELDING_WACHT);
      }
    } catch (e) {
      // De invoer blijft in het formulier staan, zodat niemand zijn tekst kwijt is.
      this.melding.set(meldingBijFout(e));
    } finally {
      this.bezig.set(false);
    }
  }
}
