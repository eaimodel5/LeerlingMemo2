import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { DocentTaak } from '../models/data.models';
import { bepaalStatus, vakSleutel, TaakStatus, STATUS_KLEUR, STATUS_ICOON, STATUS_LABEL, STATUS_UITLEG } from '../utils/taak-status';

@Component({
  selector: 'app-mentor-overview',
  standalone: true,
  imports: [FormsModule, MatIconModule, CommonModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative print:bg-white">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 print:hidden hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Mentoroverzicht</h2>
        <div class="flex gap-2">
          @if (klas() && periode() && magVergrendelen()) {
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

      @if (vergrendelFout(); as fout) {
        <div class="mx-4 sm:mx-8 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2 print:hidden">
          <mat-icon class="text-[16px] w-[16px] h-[16px] mt-0.5">error</mat-icon>
          <span class="flex-1">{{ fout }}</span>
          <button type="button" (click)="vergrendelFout.set(null)" class="text-red-400 hover:text-red-600" title="Sluiten">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">close</mat-icon>
          </button>
        </div>
      }

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

        <!-- Statusbord voor de hele klas -->
        @if (klas()) {
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm print:hidden overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">Statusbord klas {{ klas() }} — {{ periode() }}</h3>
                <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                  <span class="text-emerald-700 font-medium">{{ bordTelling().ingevuld }} ingevuld</span>
                  <span class="text-amber-700 font-medium">{{ bordTelling().open }} openstaand</span>
                  <span class="text-blue-700 font-medium">{{ bordTelling().spontaan }} nieuw, niet gevraagd</span>
                  <span class="text-slate-500">{{ bordTelling()['niet-gevraagd'] }} niet gevraagd</span>
                </div>
              </div>
              <div class="flex flex-wrap gap-2">
                <button (click)="zetTakenUitVoorKlas()" [disabled]="aantalNogUitTeZetten() === 0" class="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <mat-icon class="text-[16px] w-[16px] h-[16px]">send</mat-icon>
                  Zet taken uit voor hele klas ({{ aantalNogUitTeZetten() }})
                </button>
                <button (click)="mailAlleOpenstaand()" [disabled]="openstaandeDocenten().length === 0" class="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <mat-icon class="text-[16px] w-[16px] h-[16px]">mail</mat-icon>
                  Herinner openstaande docenten ({{ openstaandeDocenten().length }})
                </button>
              </div>
            </div>

            @if (melding(); as m) {
              <div class="px-6 py-3 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-sm flex items-center gap-2">
                <mat-icon class="text-[18px] w-[18px] h-[18px] text-emerald-500">check_circle</mat-icon>
                {{ m }}
              </div>
            }

            @if (vakKolommen().length === 0) {
              <div class="p-8 text-center text-slate-500">
                <p class="text-sm font-medium">Er zijn nog geen vakdocenten gekoppeld aan deze klas.</p>
                <p class="text-xs mt-1">Koppel ze eerst via Beheer → Docenten/Vakken.</p>
              </div>
            } @else {
              <div class="overflow-x-auto">
                <table class="text-xs border-collapse">
                  <thead>
                    <tr class="bg-slate-50">
                      <th class="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-wide border-b border-r border-slate-200 min-w-[220px]">Leerling</th>
                      @for (kol of vakKolommen(); track kol.vak) {
                        <th class="px-2 py-3 border-b border-slate-200 font-semibold text-slate-600 align-bottom min-w-[72px]" [title]="kol.docentNaam">
                          <div class="whitespace-nowrap">{{ kol.vak }}</div>
                          <div class="text-[10px] font-normal text-slate-400 truncate max-w-[72px]">{{ kol.docentNaam }}</div>
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (rij of bord(); track rij.leerling.id) {
                      <tr class="hover:bg-slate-50/60">
                        <th class="sticky left-0 z-10 bg-white px-4 py-2 text-left font-medium text-slate-700 border-b border-r border-slate-200 whitespace-nowrap">
                          <button (click)="leerlingnummer.set(rij.leerling.leerlingnummer)" class="hover:text-blue-700 hover:underline text-left">
                            {{ rij.leerling.leerling }}
                          </button>
                          <span class="text-slate-400 font-normal ml-1">{{ rij.leerling.leerlingnummer }}</span>
                        </th>
                        @for (cel of rij.cellen; track cel.kolom.vak) {
                          <td class="px-1 py-1 border-b border-slate-100 text-center">
                            <span class="inline-flex items-center justify-center w-7 h-7 rounded border"
                                  [class]="statusKleur(cel.status)"
                                  [title]="rij.leerling.leerling + ' — ' + cel.kolom.vak + ': ' + statusUitleg(cel.status)">
                              <mat-icon class="text-[16px] w-[16px] h-[16px]">{{ statusIcoon(cel.status) }}</mat-icon>
                            </span>
                          </td>
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <div class="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap gap-4 text-xs text-slate-600">
                @for (s of alleStatussen; track s) {
                  <span class="flex items-center gap-1.5">
                    <span class="inline-flex items-center justify-center w-5 h-5 rounded border" [class]="statusKleur(s)">
                      <mat-icon class="text-[13px] w-[13px] h-[13px]">{{ statusIcoon(s) }}</mat-icon>
                    </span>
                    {{ statusLabel(s) }}
                  </span>
                }
              </div>
            }

            @if (openstaandeDocenten().length > 0) {
              <div class="px-6 py-4 border-t border-slate-200">
                <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Docenten met openstaande memo's</h4>
                <div class="flex flex-wrap gap-2">
                  @for (d of openstaandeDocenten(); track d.email + d.naam) {
                    <button (click)="mailDocent(d)" class="px-3 py-1.5 rounded-md text-xs font-medium border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors flex items-center gap-1.5" [title]="d.email ? 'Mail ' + d.email : 'Geen e-mailadres bekend'">
                      <mat-icon class="text-[14px] w-[14px] h-[14px]">mail</mat-icon>
                      {{ d.naam }} ({{ d.regels.length }})
                      @if (d.herinnerdOp) {
                        <span class="text-[10px] text-amber-600">· herinnerd {{ d.herinnerdOp | date:'dd-MM' }}</span>
                      }
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }

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
  private authService = inject(AuthService);

  /** Vergrendelen mag vanaf mentor; een vakdocent kreeg hier een foutmelding. */
  magVergrendelen = computed(() => this.authService.mag('klasVergrendelen'));

  /** Zichtbaar als het slot niet weggeschreven kon worden. */
  vergrendelFout = signal<string | null>(null);

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

  // ---------- statusbord voor de hele klas ----------

  readonly alleStatussen: TaakStatus[] = ['ingevuld', 'open', 'spontaan', 'niet-gevraagd'];

  statusKleur(status: TaakStatus) { return STATUS_KLEUR[status]; }
  statusIcoon(status: TaakStatus) { return STATUS_ICOON[status]; }
  statusLabel(status: TaakStatus) { return STATUS_LABEL[status]; }
  statusUitleg(status: TaakStatus) { return STATUS_UITLEG[status]; }

  melding = signal<string | null>(null);

  /** Alle memo's van deze klas in de gekozen periode. */
  private klasMemos = computed(() => {
    const nummers = new Set(this.filteredLeerlingen().map(l => l.leerlingnummer));
    const alle = this.periode() === 'TW3'
      ? this.dataService.memoTW3().filter(m => m.schooljaar === this.schooljaar())
      : this.dataService.memoTW1TW2().filter(m => m.schooljaar === this.schooljaar() && m.toetsweek === this.periode());
    return alle.filter(m => nummers.has(m.leerlingnummer));
  });

  /**
   * De kolommen van het bord: de gekoppelde vakdocenten, aangevuld met vakken
   * waarvoor wél een memo is binnengekomen maar geen koppeling bestaat. Zonder
   * die aanvulling zou een spontaan ingevulde memo onzichtbaar blijven.
   */
  vakKolommen = computed(() => {
    const kolommen = this.vakDocentenKlas().map(dv => ({
      vak: dv.vak, docentNaam: dv.docentNaam, docentEmail: dv.docentEmail, gekoppeld: true
    }));
    const bekend = new Set(kolommen.map(k => k.vak.trim().toLowerCase()));

    for (const memo of this.klasMemos()) {
      const sleutel = memo.vak.trim().toLowerCase();
      if (bekend.has(sleutel)) continue;
      bekend.add(sleutel);
      kolommen.push({ vak: memo.vak, docentNaam: memo.docentNaam, docentEmail: memo.docentEmail, gekoppeld: false });
    }

    return kolommen.sort((a, b) => a.vak.localeCompare(b.vak, 'nl'));
  });

  private memoSleutels = computed(() =>
    new Set(this.klasMemos().map(m => vakSleutel(m.leerlingnummer, m.vak))));

  private takenPerSleutel = computed(() => {
    const kaart = new Map<string, DocentTaak>();
    for (const taak of this.dataService.docentTaken()) {
      if (taak.schooljaar !== this.schooljaar() || taak.periode !== this.periode()) continue;
      kaart.set(vakSleutel(taak.leerlingnummer, taak.vak), taak);
    }
    return kaart;
  });

  bord = computed(() => {
    const kolommen = this.vakKolommen();
    const memos = this.memoSleutels();
    const taken = this.takenPerSleutel();

    return this.filteredLeerlingen().map(leerling => ({
      leerling,
      cellen: kolommen.map(kolom => {
        const sleutel = vakSleutel(leerling.leerlingnummer, kolom.vak);
        const taak = taken.get(sleutel) ?? null;
        return { kolom, taak, status: bepaalStatus(memos.has(sleutel), !!taak) };
      })
    }));
  });

  bordTelling = computed(() => {
    const telling: Record<TaakStatus, number> = { 'niet-gevraagd': 0, 'open': 0, 'ingevuld': 0, 'spontaan': 0 };
    for (const rij of this.bord()) {
      for (const cel of rij.cellen) telling[cel.status]++;
    }
    return telling;
  });

  /** Vakdocenten die nog memo's open hebben staan, met de leerlingen erbij. */
  openstaandeDocenten = computed(() => {
    const perDocent = new Map<string, { naam: string; email: string; regels: string[]; taakIds: string[]; herinnerdOp?: string }>();

    for (const rij of this.bord()) {
      for (const cel of rij.cellen) {
        if (cel.status !== 'open') continue;
        const sleutel = (cel.kolom.docentEmail || cel.kolom.docentNaam).trim().toLowerCase();
        const bestaand = perDocent.get(sleutel)
          ?? { naam: cel.kolom.docentNaam, email: cel.kolom.docentEmail, regels: [], taakIds: [] };
        bestaand.regels.push(`${rij.leerling.leerling} — ${cel.kolom.vak}`);
        if (cel.taak?.id) bestaand.taakIds.push(cel.taak.id);
        if (cel.taak?.herinnerdOp && (!bestaand.herinnerdOp || cel.taak.herinnerdOp > bestaand.herinnerdOp)) {
          bestaand.herinnerdOp = cel.taak.herinnerdOp;
        }
        perDocent.set(sleutel, bestaand);
      }
    }

    return [...perDocent.values()].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  });

  /** Hoeveel leerling-vakcombinaties nog helemaal geen taak hebben. */
  aantalNogUitTeZetten = computed(() =>
    this.bord().reduce((totaal, rij) =>
      totaal + rij.cellen.filter(cel => cel.status === 'niet-gevraagd' && cel.kolom.gekoppeld).length, 0));

  async zetTakenUitVoorKlas() {
    const nieuwe: Omit<DocentTaak, 'id'>[] = [];
    const nu = new Date().toISOString();

    for (const rij of this.bord()) {
      for (const cel of rij.cellen) {
        // Alleen waar nog niets staat: bestaande taken en ingevulde memo's blijven met rust.
        if (cel.status !== 'niet-gevraagd' || !cel.kolom.gekoppeld) continue;
        nieuwe.push({
          schooljaar: this.schooljaar(),
          periode: this.periode() as 'TW1' | 'TW2' | 'TW3',
          klas: this.klas(),
          leerlingnummer: rij.leerling.leerlingnummer,
          leerling: rij.leerling.leerling,
          docentEmail: cel.kolom.docentEmail,
          docentNaam: cel.kolom.docentNaam,
          vak: cel.kolom.vak,
          mentorEmail: rij.leerling.mentorEmail,
          status: 'Open',
          aangemaaktOp: nu,
          gewijzigdOp: nu
        });
      }
    }

    if (nieuwe.length === 0) return;
    if (!confirm(`Voor klas ${this.klas()} in ${this.periode()} ${nieuwe.length} nieuwe taken uitzetten? Bestaande taken en al ingevulde memo's blijven ongewijzigd.`)) return;

    const aantal = await this.dataService.zetTakenUit(nieuwe);
    this.toonMelding(`${aantal} taken uitgezet.`);
  }

  // ---------- herinneringen ----------

  private opentMail(link: string) {
    window.location.href = link;
  }

  private mailtekst(regels: string[]): string {
    return [
      'Beste collega,',
      '',
      `Voor klas ${this.klas()} staan in ${this.periode()} nog leerlingmemo's open:`,
      '',
      ...regels.map(r => '- ' + r),
      '',
      'Wil je die invullen in het Leerlingmemo-systeem?',
      '',
      'Met vriendelijke groet,'
    ].join('\n');
  }

  async mailDocent(docent: { naam: string; email: string; regels: string[]; taakIds: string[] }) {
    if (!docent.email) {
      this.toonMelding(`Van ${docent.naam} is geen e-mailadres bekend. Vul dat aan bij Beheer → Docenten/Vakken.`);
      return;
    }
    const onderwerp = `Leerlingmemo's ${this.klas()} — ${this.periode()}`;
    this.opentMail(`mailto:${encodeURIComponent(docent.email)}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(this.mailtekst(docent.regels))}`);
    await this.dataService.markeerHerinnerd(docent.taakIds);
    this.toonMelding(`Herinnering voor ${docent.naam} klaargezet in je mailprogramma.`);
  }

  async mailAlleOpenstaand() {
    const docenten = this.openstaandeDocenten();
    const adressen = docenten.map(d => d.email).filter(Boolean);

    if (adressen.length === 0) {
      this.toonMelding('Van geen van deze docenten is een e-mailadres bekend.');
      return;
    }

    // Bcc, zodat docenten niet elkaars adres en niet de leerlingen van een
    // collega te zien krijgen. Daarom staan er in deze tekst geen namen.
    const onderwerp = `Leerlingmemo's ${this.klas()} — ${this.periode()}`;
    const tekst = [
      'Beste collega,',
      '',
      `Voor klas ${this.klas()} staan in ${this.periode()} nog leerlingmemo's open.`,
      'Je ziet in het Leerlingmemo-systeem bij "Mijn taken" om welke leerlingen het gaat.',
      '',
      'Met vriendelijke groet,'
    ].join('\n');

    this.opentMail(`mailto:?bcc=${encodeURIComponent(adressen.join(','))}&subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(tekst)}`);
    await this.dataService.markeerHerinnerd(docenten.flatMap(d => d.taakIds));
    this.toonMelding(`Herinnering voor ${adressen.length} docenten klaargezet in je mailprogramma.`);
  }

  private toonMelding(tekst: string) {
    this.melding.set(tekst);
    setTimeout(() => this.melding.set(null), 5000);
  }

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
    
    // Deed dit eerder zonder await en zonder catch: mislukte de schrijfactie,
    // dan bleef het slotje gewoon staan alsof er niets aan de hand was.
    this.dataService.toggleLock(this.klas(), p, this.schooljaar(), newState)
      .catch((e: unknown) => {
        this.vergrendelFout.set(e instanceof Error ? e.message : 'De klas kon niet worden vergrendeld.');
      });
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

    const nu = new Date().toISOString();
    // Via zetTakenUit, zodat al bestaande taken worden overgeslagen in plaats van
    // opnieuw op 'Open' gezet. Een tweede klik wiste anders de voortgang.
    const aantal = await this.dataService.zetTakenUit(vakDocenten.map(docentVak => ({
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
      aangemaaktOp: nu,
      gewijzigdOp: nu,
    })));

    this.toonMelding(aantal === 0
      ? 'Er stonden al taken uit voor deze leerling; er is niets gewijzigd.'
      : `${aantal} nieuwe taken uitgezet voor ${leerling.leerling}.`);
  }

  async removeTaak(taak: any) {
    if (!confirm(`Weet je zeker dat je de taak voor ${taak.docentNaam} wilt intrekken?`)) return;
    if (taak.id) {
      await this.dataService.deleteDocentTaak(taak.id);
    }
  }
}
