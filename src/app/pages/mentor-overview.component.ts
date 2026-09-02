import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mentor-overview',
  standalone: true,
  imports: [FormsModule, MatIconModule, CommonModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative print:bg-white">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 print:hidden hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Mentoroverzicht</h2>
        <div class="flex gap-2">
          @if (klas() && periode()) {
            <button (click)="toggleClassLock()" [class]="isClassLocked() ? 'bg-white text-red-700 hover:bg-red-50 border-red-200' : 'bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-200'" class="px-3 py-1.5 text-xs font-medium rounded-md border transition-all flex items-center gap-1.5 shadow-sm">
              <mat-icon class="text-[16px] w-[16px] h-[16px]">{{ isClassLocked() ? 'lock' : 'lock_open' }}</mat-icon>
              {{ isClassLocked() ? 'Gesloten' : 'Sluit Invoer' }}
            </button>
          }
          <button (click)="printPage()" [disabled]="!leerlingnummer()" class="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 bg-white rounded-md border border-slate-300 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">print</mat-icon>
            Afdrukken
          </button>
        </div>
      </header>

      <!-- Print View Header -->
      <div class="hidden print:block p-8 border-b-2 border-slate-800 mb-8">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">Emmauscollege Rotterdam</h1>
            <p class="text-lg font-bold text-slate-600">Mentoroverzicht - {{ periode() }}</p>
            <p class="text-md font-bold text-slate-500">{{ selectedLeerling()?.leerling }} ({{ selectedLeerling()?.leerlingnummer }})</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold">{{ schooljaar() }}</p>
            <p class="text-xs text-slate-500">{{ today | date:'dd-MM-yyyy' }}</p>
          </div>
        </div>
      </div>

      <div class="flex-1 p-4 sm:p-8 space-y-6 print:p-0 print:space-y-4">
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end print:hidden">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Schooljaar</label>
            <select [ngModel]="schooljaar()" (ngModelChange)="schooljaar.set($event)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Periode</label>
            <select [ngModel]="periode()" (ngModelChange)="periode.set($event)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="TW1">TW1</option>
              <option value="TW2">TW2</option>
              <option value="TW3">TW3</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Klas</label>
            <select [ngModel]="klas()" (ngModelChange)="klas.set($event); onKlasChange()" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">-- Kies --</option>
              @for (k of availableKlassen(); track k) {
                <option [value]="k">{{k}}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Leerling</label>
            <select [ngModel]="leerlingnummer()" (ngModelChange)="leerlingnummer.set($event)" [disabled]="!klas()" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" [class.bg-slate-100]="!klas()">
              <option value="">-- Kies --</option>
              @for (l of filteredLeerlingen(); track l.id) {
                <option [value]="l.leerlingnummer">{{l.leerling}} ({{l.leerlingnummer}})</option>
              }
            </select>
          </div>
        </div>

        @if (selectedLeerling() && leerlingnummer()) {
          <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between text-blue-900 shadow-sm print:shadow-none print:border-blue-200">
            <div>
              <h3 class="text-lg font-bold">{{selectedLeerling()?.leerling}} ({{selectedLeerling()?.leerlingnummer}})</h3>
              <p class="text-sm text-blue-700/80">Klas: {{selectedLeerling()?.klas}} | Mentor: {{selectedLeerling()?.mentorNaam}}</p>
            </div>
            <div class="px-3 py-1 bg-white rounded-full text-sm font-semibold border border-blue-200 shadow-sm print:shadow-none">
              {{periode()}}
            </div>
          </div>

          <div class="space-y-4 print:space-y-6">
            <!-- Taken Block -->
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm print:hidden">
              <div class="flex justify-between items-center mb-4">
                <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Uitgezette Taken ({{docentTaken().length}})</h3>
                <button (click)="assignTasksToAll()" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5">
                  <mat-icon class="text-[16px] w-[16px] h-[16px]">send</mat-icon> Zet taken uit ({{vakDocentenKlas().length}} vakdocenten)
                </button>
              </div>
              
              @if (docentTaken().length === 0) {
                <div class="p-4 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                  <p class="text-sm">Nog geen taken uitgezet voor deze leerling.</p>
                </div>
              } @else {
                <div class="flex flex-wrap gap-2">
                  @for (taak of docentTaken(); track taak.id) {
                    <div class="px-3 py-1.5 rounded-md text-xs font-medium border flex items-center gap-2"
                         [class.bg-yellow-50]="taak.status === 'Open'"
                         [class.text-yellow-800]="taak.status === 'Open'"
                         [class.border-yellow-200]="taak.status === 'Open'"
                         [class.bg-emerald-50]="taak.status === 'Ingevuld'"
                         [class.text-emerald-800]="taak.status === 'Ingevuld'"
                         [class.border-emerald-200]="taak.status === 'Ingevuld'">
                      <mat-icon class="text-[14px] w-[14px] h-[14px]">{{ taak.status === 'Ingevuld' ? 'check_circle' : 'pending' }}</mat-icon>
                      {{taak.docentNaam}} ({{taak.vak}})
                      <button (click)="removeTaak(taak)" class="ml-1 opacity-50 hover:opacity-100" title="Taak intrekken"><mat-icon class="text-[14px] w-[14px] h-[14px]">close</mat-icon></button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Memos Block -->
            @if (memos().length === 0) {
              <div class="p-8 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-white print:border-slate-300">
                <mat-icon class="mx-auto text-4xl mb-2 text-slate-300 print:hidden">inbox</mat-icon>
                <p>Geen memo's gevonden voor deze leerling in deze periode.</p>
              </div>
            } @else {
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-1 print:gap-6">
                @for (memo of memos(); track memo.id) {
                  <div class="bg-white border text-sm border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow print:shadow-none print:border-slate-300 print:break-inside-avoid">
                    <div class="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center print:bg-white print:border-slate-800 print:border-b-2">
                      <div class="font-bold text-slate-800 uppercase tracking-tight">{{memo.vak}} - {{memo.docentNaam}}</div>
                      <div class="flex gap-2 print:hidden">
                        <span class="px-2 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider border" [class.bg-emerald-50]="memo.status === 'Definitief'" [class.text-emerald-700]="memo.status === 'Definitief'" [class.border-emerald-200]="memo.status === 'Definitief'" [class.bg-yellow-50]="memo.status === 'Concept'" [class.text-yellow-700]="memo.status === 'Concept'" [class.border-yellow-200]="memo.status === 'Concept'">
                          {{memo.status}}
                        </span>
                      </div>
                    </div>
                    <div class="p-4 space-y-4 flex-1">
                      <div>
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wide print:text-slate-900 border-b border-slate-100 print:block print:mb-1">Aandachtspunten</span>
                        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                          @if (memo.aandachtInhoudelijkBegrip) { <span class="flex items-center gap-1"><mat-icon class="text-[14px] w-[14px] h-[14px] text-emerald-500">check_circle</mat-icon> Inhoudelijk begrip</span> }
                          @if (memo.aandachtPlanningOrganisatie) { <span class="flex items-center gap-1"><mat-icon class="text-[14px] w-[14px] h-[14px] text-emerald-500">check_circle</mat-icon> Planning / organisatie</span> }
                          @if (memo.aandachtToetsvoorbereidingLeerstrategie) { <span class="flex items-center gap-1"><mat-icon class="text-[14px] w-[14px] h-[14px] text-emerald-500">check_circle</mat-icon> Toetsvoorbereiding</span> }
                          @if (memo.aandachtInzetWerkhouding) { <span class="flex items-center gap-1"><mat-icon class="text-[14px] w-[14px] h-[14px] text-emerald-500">check_circle</mat-icon> Inzet / werkhouding</span> }
                          @if (memo.aandachtWerkNietOpOrde) { <span class="flex items-center gap-1"><mat-icon class="text-[14px] w-[14px] h-[14px] text-emerald-500">check_circle</mat-icon> Werk niet op orde</span> }
                          @if (memo.aandachtAanwezigheidVerzuim) { <span class="flex items-center gap-1"><mat-icon class="text-[14px] w-[14px] h-[14px] text-emerald-500">check_circle</mat-icon> Aanwezigheid / verzuim</span> }
                        </div>
                      </div>
                      
                      <div class="w-full h-px bg-slate-100 print:bg-slate-300"></div>

                      <div>
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wide print:text-slate-900 border-b border-slate-100 print:block print:mb-1">Waar zie je dit aan?</span>
                        <p class="text-slate-700 mt-1 whitespace-pre-wrap">{{memo.waarZieJeDitAan}}</p>
                      </div>

                      @if(memo.watWerktWel) {
                        <div>
                          <span class="text-xs font-bold text-slate-400 uppercase tracking-wide print:text-slate-900 border-b border-slate-100 print:block print:mb-1">Wat werkt wel?</span>
                          <p class="text-slate-700 mt-1 whitespace-pre-wrap">{{memo.watWerktWel}}</p>
                        </div>
                      }
                      
                      @if(isTW3(memo)) {
                        <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2 print:bg-white print:border-slate-300">
                          <span class="text-xs font-bold text-blue-500 uppercase tracking-wide print:text-slate-900">Doorstroomtoelichting</span>
                          <p class="text-blue-900 mt-1 whitespace-pre-wrap print:text-slate-800">{{getTW3(memo).doorstroomToelichting}}</p>
                        </div>
                      } @else {
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 print:grid-cols-1 print:gap-4">
                          <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-white print:border-slate-300">
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wide print:text-slate-900">Actie leerling</span>
                            <p class="text-slate-700 mt-1 whitespace-pre-wrap">{{getTW12(memo).leerlingActie}}</p>
                          </div>
                          <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 print:bg-white print:border-slate-300">
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wide print:text-slate-900">Actie docent</span>
                            <p class="text-slate-700 mt-1 whitespace-pre-wrap">{{getTW12(memo).docentActie}}</p>
                          </div>
                        </div>
                        @if(getTW12(memo).emc) {
                          <div class="mt-2 text-sm flex items-center gap-2">
                            <span class="text-xs font-bold text-slate-400 uppercase tracking-wide print:text-slate-900">EMC:</span>
                            <span class="px-2 py-0.5 rounded text-xs font-bold border" [class.bg-red-50]="getTW12(memo).emc === 'Ja'" [class.text-red-700]="getTW12(memo).emc === 'Ja'" [class.border-red-200]="getTW12(memo).emc === 'Ja'" [class.bg-slate-100]="getTW12(memo).emc === 'Nee'" [class.text-slate-600]="getTW12(memo).emc === 'Nee'" [class.border-slate-200]="getTW12(memo).emc === 'Nee'">{{getTW12(memo).emc}}</span>
                          </div>
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class MentorOverviewComponent {
  private dataService = inject(DataService);

  schooljaar = signal('2026-2027');
  periode = signal('TW1');
  klas = signal('');
  leerlingnummer = signal('');
  today = new Date();

  availableKlassen = computed(() => {
    const lln = this.dataService.leerlingen().filter(l => l.actief && l.schooljaar === this.schooljaar());
    return [...new Set(lln.map(l => l.klas))].sort();
  });

  filteredLeerlingen = computed(() => {
    if (!this.klas()) return [];
    return this.dataService.leerlingen().filter(l => l.actief && l.schooljaar === this.schooljaar() && l.klas === this.klas());
  });

  selectedLeerling = computed(() => {
    return this.dataService.leerlingen().find(l => l.leerlingnummer === this.leerlingnummer());
  });

  docentTaken = computed(() => {
    if (!this.leerlingnummer()) return [];
    return this.dataService.docentTaken().filter(t => 
      t.leerlingnummer === this.leerlingnummer() && 
      t.periode === this.periode() && 
      t.schooljaar === this.schooljaar()
    ).sort((a,b) => a.docentNaam.localeCompare(b.docentNaam));
  });

  vakDocentenKlas = computed(() => {
    if (!this.klas()) return [];
    return this.dataService.docentVakken().filter(dv => dv.klas === this.klas() && dv.actief && dv.schooljaar === this.schooljaar());
  });

  memos = computed(() => {
    if (!this.leerlingnummer()) return [];
    
    if (this.periode() === 'TW3') {
      return this.dataService.memoTW3().filter(m => m.schooljaar === this.schooljaar() && m.leerlingnummer === this.leerlingnummer()).sort((a,b) => a.vak.localeCompare(b.vak));
    } else {
      return this.dataService.memoTW1TW2().filter(m => m.schooljaar === this.schooljaar() && m.leerlingnummer === this.leerlingnummer() && m.toetsweek === this.periode()).sort((a,b) => a.vak.localeCompare(b.vak));
    }
  });

  onKlasChange() {
    this.leerlingnummer.set('');
  }

  printPage() {
    window.print();
  }

  isTW3(memo: any): boolean {
    return memo.toetsweek === 'TW3' || memo.doorstroomToelichting !== undefined;
  }

  isClassLocked = computed(() => {
    if (!this.klas() || !this.periode()) return false;
    const lockId = `${this.klas()}_${this.periode()}_${this.schooljaar()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const lock = this.dataService.classLocks().find(l => l.id === lockId);
    return lock ? lock.isLocked : false;
  });

  toggleClassLock() {
    if (!this.klas() || !this.periode()) return;
    const p = this.periode() as 'TW1' | 'TW2' | 'TW3';
    const newState = !this.isClassLocked();
    
    if (newState) {
      if (!confirm(`Weet je zeker dat je de invoer voor klas ${this.klas()} in ${this.periode()} wilt sluiten? Docenten kunnen dan geen wijzigingen meer doen.`)) {
        return;
      }
    }
    
    this.dataService.toggleLock(this.klas(), p, this.schooljaar(), newState);
  }

  getTW12(memo: any): any {
    return memo;
  }

  getTW3(memo: any): any {
    return memo;
  }

  async assignTasksToAll() {
    const leerling = this.selectedLeerling();
    if (!leerling) return;

    const vakDocenten = this.vakDocentenKlas();
    if (vakDocenten.length === 0) {
      alert('Geen vakdocenten gevonden voor deze klas in dit schooljaar.');
      return;
    }

    if (!confirm(`Weet je zeker dat je voor ${leerling.leerling} bij alle ${vakDocenten.length} vakdocenten een taak wilt uitzetten?`)) {
      return;
    }

    for (const docentVak of vakDocenten) {
      await this.dataService.saveDocentTaak({
        schooljaar: this.schooljaar(),
        periode: this.periode() as 'TW1' | 'TW2' | 'TW3',
        klas: this.klas(),
        leerlingnummer: leerling.leerlingnummer,
        leerling: leerling.leerling,
        docentEmail: docentVak.docentEmail,
        docentNaam: docentVak.docentNaam,
        vak: docentVak.vak,
        mentorEmail: leerling.mentorEmail,
        status: 'Open',
        aangemaaktOp: new Date().toISOString(),
        gewijzigdOp: new Date().toISOString(),
      });
    }
  }

  async removeTaak(taak: any) {
    if (!confirm(`Weet je zeker dat je de taak voor ${taak.docentNaam} wilt intrekken?`)) return;
    if (taak.id) {
      await this.dataService.deleteDocentTaak(taak.id);
    }
  }
}
