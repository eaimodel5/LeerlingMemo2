import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { Docent, Leerling } from '../models/data.models';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { parseCsv, downloadCsv } from '../utils/csv';
import { normaliseerKoppen, rijNaarObject, leesLeerlingRij } from '../utils/leerling-import';
import {
  afkortingIsGeldig,
  normaliseerAfkorting,
  toonAfkorting,
  zelfdeAfkorting
} from '../utils/docent-afkorting';

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
          @if (magVerwijderen()) {
            <button (click)="deleteAllStudents()" class="px-3 py-1.5 text-xs font-medium text-red-600 bg-white hover:bg-red-50 border border-red-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap" title="Wis alle leerlingen">
              <mat-icon class="text-[16px] w-[16px] h-[16px]">delete_sweep</mat-icon> Wis Lijst
            </button>
          }
          <button (click)="openForm()" class="px-3 py-1.5 text-xs font-medium text-white bg-[#0d1e3a] hover:bg-[#1b3054] rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">add</mat-icon> Nieuw
          </button>
        </div>
      </header>

      <div class="flex-1 p-4 sm:p-8 space-y-6">
        @if (mentorProblemen().length > 0) {
          <div class="bg-amber-50 border border-amber-300 rounded-xl p-4 shadow-sm">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0">
                  <mat-icon class="text-xl">warning</mat-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-amber-900">
                    {{ mentorProblemen().length }} leerlingen vereisen een canonieke mentor (PR8-readiness)
                  </h3>
                  <p class="text-xs text-amber-800 mt-1 max-w-2xl leading-relaxed">
                    Voor PR8-readiness moet elke leerling met een bestaande mentorrelatie expliciet gekoppeld zijn aan een canonieke docent uit de personeelsadministratie. Koppelen op basis van naam of e-mail is niet toegestaan.
                  </p>
                </div>
              </div>
              <button
                (click)="toggleAlleenHerstel()"
                class="px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                [class]="alleenMentorProblemen() ? 'bg-amber-600 text-white border-amber-700' : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'">
                <mat-icon class="text-[16px]">filter_list</mat-icon>
                {{ alleenMentorProblemen() ? 'Toon alle leerlingen' : 'Filter op te herstellen' }}
              </button>
            </div>
          </div>
        }

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
                  <td class="px-6 py-4 whitespace-nowrap text-sm">
                    @let ms = getMentorStatus(l);
                    @if (ms.soort === 'inOrde') {
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {{ toon(ms.afkorting || '') }}
                        </span>
                        <span class="text-slate-700 text-xs font-medium">{{ l.mentorNaam || ms.docent?.naam }}</span>
                      </div>
                    } @else if (ms.soort === 'geen') {
                      <span class="text-slate-400 italic text-xs">Geen mentor</span>
                    } @else {
                      <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                          <mat-icon class="text-[13px] w-[13px] h-[13px]">warning</mat-icon>
                          {{ ms.soort === 'ontbreekt' ? 'Koppeling vereist' : 'Onbekend (' + ms.afkorting + ')' }}
                        </span>
                        <button
                          (click)="openRepairMentor(l)"
                          class="px-2 py-0.5 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition-colors cursor-pointer"
                          title="Koppel canonieke mentor">
                          Koppel
                        </button>
                      </div>
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    @if (l.actief) {
                      <span class="px-2.5 py-1 inline-flex text-[10px] uppercase font-bold rounded-full bg-emerald-100 text-emerald-800 border-0">Actief</span>
                    } @else {
                      <span class="px-2.5 py-1 inline-flex text-[10px] uppercase font-bold rounded-full bg-slate-100 text-slate-500 border-0">Inactief</span>
                    }
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button (click)="toggleActive(l)" class="text-slate-400 hover:text-slate-600 transition-colors mx-2 cursor-pointer" title="{{l.actief ? 'Deactiveer' : 'Activeer'}}">
                      <mat-icon class="text-[20px] w-[20px] h-[20px]">{{l.actief ? 'block' : 'check_circle'}}</mat-icon>
                    </button>
                    <button (click)="edit(l)" class="text-blue-600 hover:text-blue-800 transition-colors ml-2 mr-2 cursor-pointer" title="Bewerk">
                      <mat-icon class="text-[20px] w-[20px] h-[20px]">edit</mat-icon>
                    </button>
                    @if (magVerwijderen()) {
                      <button (click)="deleteItem(l)" class="text-red-500 hover:text-red-700 transition-colors ml-1 cursor-pointer" title="Verwijder">
                        <mat-icon class="text-[20px] w-[20px] h-[20px]">delete</mat-icon>
                      </button>
                    }
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

      <!-- Snelle Reparatie Modal voor Mentor-koppeling -->
      @if (repairingStudent(); as st) {
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Mentor koppelen</h3>
              <button (click)="closeRepairMentor()" class="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <mat-icon class="text-[20px] w-[20px] h-[20px]">close</mat-icon>
              </button>
            </div>
            <div class="p-6 space-y-4 text-sm">
              <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs">
                <div><span class="text-slate-500">Leerling:</span> <strong class="text-slate-800">{{ st.leerling }}</strong> ({{ st.leerlingnummer }}, klas {{ st.klas }})</div>
                @if (st.mentorNaam) {
                  <div><span class="text-slate-500">Huidige weergavenaam:</span> <span class="text-slate-800 font-medium">{{ st.mentorNaam }}</span></div>
                }
                @if (st.mentorEmail) {
                  <div><span class="text-slate-500">Huidig e-mailadres:</span> <span class="text-slate-800">{{ st.mentorEmail }}</span></div>
                }
                @if (st.mentorAfkorting) {
                  <div><span class="text-slate-500">Huidige afkorting:</span> <span class="text-red-600 font-mono font-bold">{{ st.mentorAfkorting }} (onbekend)</span></div>
                }
              </div>

              <div>
                <label for="repair-mentor-select" class="block text-xs font-bold text-slate-700 mb-1">
                  Kies canonieke docent als mentor *
                </label>
                <select
                  id="repair-mentor-select"
                  [value]="selectedRepairMentorAfkorting()"
                  (change)="onRepairMentorChange($event)"
                  class="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm">
                  <option value="">-- Selecteer een actieve docent --</option>
                  @for (d of actieveDocenten(); track d.afkorting) {
                    <option [value]="d.afkorting">{{ toon(d.afkorting) }} - {{ d.naam }}</option>
                  }
                </select>
                <p class="text-[11px] text-slate-500 mt-1.5">
                  Let op: kies bewust de juiste docent. Er wordt nooit automatisch gekoppeld op basis van naam of e-mail.
                </p>
              </div>

              <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  (click)="closeRepairMentor()"
                  class="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                  Annuleren
                </button>
                <button
                  type="button"
                  (click)="saveRepairMentor()"
                  [disabled]="!selectedRepairMentorAfkorting()"
                  class="px-4 py-2 text-sm font-bold bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
                  <mat-icon class="text-[18px]">check</mat-icon>
                  Opslaan & Koppelen
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      
      <!-- Mapping Modal -->
      @if (showMappingModal()) {
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60] overflow-y-auto">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col my-8">
            <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 sticky top-0">
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">Koppel Mentoren uit Import</h3>
              <button (click)="cancelImport()" class="text-slate-400 hover:text-slate-600 transition-colors">
                <mat-icon class="text-[20px] w-[20px] h-[20px]">close</mat-icon>
              </button>
            </div>
            <div class="p-6 overflow-y-auto">
              <p class="text-sm text-slate-600 mb-4">
                De volgende mentornamen uit het importbestand zijn nog niet gekoppeld aan een canonieke docent.
                Kies voor elke naam de juiste docent. (Kies "-- Geen --" om de mentor te wissen).
              </p>
              
              <div class="space-y-4">
                @for (mapping of importMappings(); track mapping.bronNaam; let idx = $index) {
                  <div class="flex items-center gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div class="w-1/2">
                      <div class="text-xs text-slate-500">Naam in bestand</div>
                      <div class="font-medium text-sm text-slate-800">{{ mapping.bronNaam || '(Leeg/Onbekend)' }}</div>
                    </div>
                    <div class="w-1/2">
                      <div class="text-xs text-slate-500 mb-1">Koppel aan</div>
                      <select
                        [value]="mapping.gekozenAfkorting"
                        (change)="updateMapping(idx, $event)"
                        class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                        <option value="">-- Geen / Wis mentor --</option>
                        @for (d of actieveDocenten(); track d.afkorting) {
                          <option [value]="d.afkorting">{{ toon(d.afkorting) }} - {{ d.naam }}</option>
                        }
                      </select>
                    </div>
                  </div>
                }
              </div>
            </div>
            <div class="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
              <button
                (click)="cancelImport()"
                class="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">
                Annuleren
              </button>
              <button
                (click)="processImport()"
                class="px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Opslaan & Importeren
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Formulier Modal -->
      @if (showForm()) {
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div class="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div class="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wide">{{editingId() ? 'Wijzig' : 'Nieuwe'}} Leerling</h3>
              <button (click)="closeForm()" class="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
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

              <div>
                <label for="form-mentor-select" class="block text-xs font-semibold text-slate-600 mb-1">Mentor (canonieke docent)</label>
                <select
                  id="form-mentor-select"
                  formControlName="mentorAfkorting"
                  (change)="onFormMentorSelectChange($event)"
                  class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  <option value="">-- Geen mentor / Mentor ontkoppelen --</option>
                  @for (d of actieveDocenten(); track d.afkorting) {
                    <option [value]="d.afkorting">{{ toon(d.afkorting) }} - {{ d.naam }}</option>
                  }
                </select>
                <p class="text-[11px] text-slate-500 mt-1">
                  Koppelen op basis van naam of e-mail is niet toegestaan. Selecteer een docent uit de lijst.
                </p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Mentor Weergavenaam</label>
                  <input type="text" formControlName="mentorNaam" [readonly]="true" class="w-full p-2 text-sm border border-slate-200 bg-slate-50 text-slate-600 rounded outline-none cursor-not-allowed">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Mentor Email</label>
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
                <button type="button" (click)="closeForm()" class="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer">Annuleren</button>
                <button type="submit" class="px-4 py-2 text-sm font-medium bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-sm cursor-pointer">Opslaan</button>
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
  private authService = inject(AuthService);

  docenten = this.dataService.docenten;
  actieveDocenten = computed(() =>
    this.docenten()
      .filter(d => d.actief)
      .sort((a, b) => a.afkorting.localeCompare(b.afkorting))
  );

  /**
   * Een mentor mag leerlingen toevoegen en bijwerken — dat is wat het koppelen
   * van docenten en de mentor aan een leerling vraagt. Verwijderen blijft bij de
   * coordinator: dat is onomkeerbaar en neemt de memo's mee.
   */
  magVerwijderen = computed(() => this.authService.mag('leerlingenVerwijderen'));
  private fb = inject(FormBuilder);

  searchQuery = signal('');
  filterKlas = signal('');
  showForm = signal(false);
  bezig = signal(false);

  showMappingModal = signal(false);
  importMappings = signal<{ bronNaam: string, gekozenAfkorting: string }[]>([]);
  pendingImportData = signal<any[]>([]);

  editingId = signal<string | null>(null);

  alleenMentorProblemen = signal(false);
  repairingStudent = signal<Leerling | null>(null);
  selectedRepairMentorAfkorting = signal<string>('');

  form = this.fb.group({
    leerlingnummer: ['', Validators.required],
    leerling: ['', Validators.required],
    klas: ['', Validators.required],
    mentorAfkorting: [''],
    mentorNaam: [''],
    mentorEmail: ['', Validators.email],
    schooljaar: ['2026-2027'],
    actief: [true]
  });

  toon(afkorting: string): string {
    return toonAfkorting(afkorting);
  }

  getMentorStatus(l: Leerling): {
    soort: 'inOrde' | 'ontbreekt' | 'onbekend' | 'geen';
    afkorting?: string;
    docent?: Docent;
  } {
    const heeftRelatie = Boolean(
      (l.mentorNaam && l.mentorNaam.trim()) ||
      (l.mentorEmail && l.mentorEmail.trim()) ||
      (l.mentorAfkorting && l.mentorAfkorting.trim())
    );

    if (!heeftRelatie) {
      return { soort: 'geen' };
    }

    const rawAfk = l.mentorAfkorting?.trim();
    if (!rawAfk) {
      return { soort: 'ontbreekt' };
    }

    const norm = normaliseerAfkorting(rawAfk);
    const docent = this.docenten().find(d => zelfdeAfkorting(d.afkorting, norm));
    if (!docent) {
      return { soort: 'onbekend', afkorting: norm };
    }

    return { soort: 'inOrde', afkorting: norm, docent };
  }

  mentorProblemen = computed(() => {
    const bekende = new Set(this.docenten().map(d => normaliseerAfkorting(d.afkorting)).filter(Boolean));
    return this.dataService.leerlingen()
      .filter(l => l.schooljaar === '2026-2027')
      .filter(l => {
        const heeftRelatie = Boolean(
          (l.mentorNaam && l.mentorNaam.trim()) ||
          (l.mentorEmail && l.mentorEmail.trim()) ||
          (l.mentorAfkorting && l.mentorAfkorting.trim())
        );
        if (!heeftRelatie) return false;
        const norm = l.mentorAfkorting ? normaliseerAfkorting(l.mentorAfkorting) : '';
        return !norm || !bekende.has(norm);
      });
  });

  toggleAlleenHerstel() {
    this.alleenMentorProblemen.update(v => !v);
  }

  availableKlassen = computed(() => {
    const lln = this.dataService.leerlingen().filter(l => l.schooljaar === '2026-2027');
    // Leerlingen zonder klas leveren anders een lege optie in de keuzelijst op.
    return [...new Set(lln.map(l => l.klas).filter(klas => klas !== ''))].sort((a, b) => a.localeCompare(b, 'nl'));
  });

  filteredLeerlingen = computed(() => {
    let result = this.dataService.leerlingen().filter(l => l.schooljaar === '2026-2027');

    if (this.alleenMentorProblemen()) {
      const probleemIds = new Set(this.mentorProblemen().map(l => l.id || l.leerlingnummer));
      result = result.filter(l => probleemIds.has(l.id || l.leerlingnummer));
    }

    if (this.filterKlas()) {
      result = result.filter(l => l.klas === this.filterKlas());
    }

    if (this.searchQuery()) {
      const q = this.searchQuery().trim().toLowerCase();
      result = result.filter(l =>
        l.leerling.toLowerCase().includes(q) ||
        l.leerlingnummer.toLowerCase().includes(q) ||
        (l.mentorNaam || '').toLowerCase().includes(q) ||
        (l.mentorAfkorting || '').toLowerCase().includes(q)
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
    this.form.reset({ schooljaar: '2026-2027', actief: true, mentorAfkorting: '', mentorNaam: '', mentorEmail: '' });
    this.editingId.set(null);
    this.showForm.set(true);
  }

  onFormMentorSelectChange(event: Event) {
    const rawAfk = (event.target as HTMLSelectElement).value;
    if (!rawAfk) {
      this.form.patchValue({ mentorAfkorting: '', mentorNaam: '' });
      return;
    }
    const docent = this.docenten().find(d => zelfdeAfkorting(d.afkorting, rawAfk));
    if (docent) {
      this.form.patchValue({
        mentorAfkorting: normaliseerAfkorting(docent.afkorting),
        mentorNaam: docent.naam,
      });
    }
  }

  openRepairMentor(l: Leerling) {
    this.repairingStudent.set(l);
    const bestaand = l.mentorAfkorting && afkortingIsGeldig(l.mentorAfkorting)
      ? normaliseerAfkorting(l.mentorAfkorting)
      : '';
    this.selectedRepairMentorAfkorting.set(bestaand);
  }

  closeRepairMentor() {
    this.repairingStudent.set(null);
    this.selectedRepairMentorAfkorting.set('');
  }

  onRepairMentorChange(event: Event) {
    this.selectedRepairMentorAfkorting.set((event.target as HTMLSelectElement).value);
  }

  async saveRepairMentor() {
    const student = this.repairingStudent();
    if (!student || !student.id) return;

    const rawAfk = this.selectedRepairMentorAfkorting().trim();
    if (!rawAfk || !afkortingIsGeldig(rawAfk)) {
      alert('Kies een geldige docentafkorting.');
      return;
    }

    const norm = normaliseerAfkorting(rawAfk);
    const docent = this.docenten().find(d => zelfdeAfkorting(d.afkorting, norm));
    if (!docent) {
      alert(`Docent met afkorting "${norm}" niet gevonden in het docentenbestand. Onbekende afkorting geweigerd.`);
      return;
    }

    if (!docent.actief) {
      alert(`Docent "${docent.naam}" (${toonAfkorting(norm)}) is inactief.`);
      return;
    }

    this.bezig.set(true);
    try {
      await this.dataService.updateLeerling(student.id, {
        mentorAfkorting: norm,
        mentorNaam: docent.naam,
      });
      this.closeRepairMentor();
    } catch {
      alert('Er ging iets mis bij het opslaan van de mentorkoppeling.');
    } finally {
      this.bezig.set(false);
    }
  }

  
  updateMapping(index: number, event: Event) {
    const afk = (event.target as HTMLSelectElement).value;
    this.importMappings.update(mappings => {
      const updated = [...mappings];
      updated[index].gekozenAfkorting = afk;
      return updated;
    });
  }

  cancelImport() {
    this.showMappingModal.set(false);
    this.pendingImportData.set([]);
    this.importMappings.set([]);
  }

  async processImport() {
    this.showMappingModal.set(false);
    this.bezig.set(true);
    
    try {
      const mappings = new Map(this.importMappings().map(m => [m.bronNaam, m.gekozenAfkorting]));
      const teSchrijven: { id?: string; data: any }[] = [];
      const data = this.pendingImportData();
      
      for (const item of data) {
        let finAfk = item.data.mentorAfkorting;
        let finNaam = item.data.mentorNaam;
        let finEmail = item.data.mentorEmail;
        
        if (!finAfk && finNaam && mappings.has(finNaam)) {
          const mapAfk = mappings.get(finNaam);
          if (mapAfk) {
            const docent = this.docenten().find(d => zelfdeAfkorting(d.afkorting, mapAfk));
            if (docent) {
              finAfk = normaliseerAfkorting(docent.afkorting);
              finNaam = docent.naam;
            } else {
              finAfk = '';
              finNaam = '';
              finEmail = '';
            }
          } else {
            finAfk = '';
            finNaam = '';
            finEmail = '';
          }
        }
        
        const finalData = { ...item.data };
        if (finAfk) {
          finalData.mentorAfkorting = finAfk;
          finalData.mentorNaam = finNaam;
          finalData.mentorEmail = finEmail;
        } else {
          delete finalData.mentorAfkorting;
          finalData.mentorNaam = '';
          finalData.mentorEmail = '';
        }
        
        teSchrijven.push({ id: item.id, data: finalData });
      }
      
      const nieuw = teSchrijven.filter(t => !t.id).length;
      const bijgewerkt = teSchrijven.length - nieuw;
      
      await this.dataService.bulkSaveLeerlingen(teSchrijven);
      alert(`Import klaar: ${nieuw} nieuw, ${bijgewerkt} bijgewerkt.`);
    } catch {
      alert('Er ging iets mis bij het opslaan.');
    } finally {
      this.bezig.set(false);
      this.pendingImportData.set([]);
      this.importMappings.set([]);
    }
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
        alert('Er staan geen regels onder de kopregel.');
        input.value = '';
        return;
      }

      const headers = normaliseerKoppen(rows[0]);
      const schooljaar = '2026-2027';

      const parsedData: { id?: string; data: any }[] = [];
      const onbekendeMentoren = new Set<string>();
      
      const inDitBestand = new Set<string>();
      const afgewezenOnbekendeAfkorting: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const { leerlingnummer, leerling, klas, mentorNaam, mentorEmail, mentorAfkorting, actief } =
          leesLeerlingRij(rijNaarObject(headers, rows[i]));

        if (!leerlingnummer || !leerling) continue;
        if (inDitBestand.has(leerlingnummer)) continue;
        inDitBestand.add(leerlingnummer);

        const bestaand = this.dataService.leerlingen().find(l =>
          l.leerlingnummer === leerlingnummer && l.schooljaar === schooljaar
        );

        let finaleMentorAfkorting = '';
        let finaleMentorNaam = mentorNaam;

        if (mentorAfkorting) {
          const norm = normaliseerAfkorting(mentorAfkorting);
          const docent = this.docenten().find(d => zelfdeAfkorting(d.afkorting, norm));
          if (!docent || !docent.actief) {
            afgewezenOnbekendeAfkorting.push(`Rij ${i+1}: ${mentorAfkorting}`);
            continue;
          }
          finaleMentorAfkorting = norm;
          finaleMentorNaam = docent.naam;
        } else if (bestaand?.mentorAfkorting) {
          finaleMentorAfkorting = bestaand.mentorAfkorting;
          finaleMentorNaam = bestaand.mentorNaam || mentorNaam;
        } else if (mentorNaam) {
          onbekendeMentoren.add(mentorNaam);
        }

        parsedData.push({
          id: bestaand?.id,
          data: {
            leerlingnummer,
            leerling,
            klas,
            mentorNaam: finaleMentorNaam,
            mentorEmail: mentorEmail || '',
            ...(finaleMentorAfkorting ? { mentorAfkorting: finaleMentorAfkorting } : {}),
            schooljaar,
            actief
          }
        });
      }

      if (parsedData.length === 0) {
        alert('Geen bruikbare regels gevonden.');
        input.value = '';
        return;
      }

      if (onbekendeMentoren.size > 0) {
        this.pendingImportData.set(parsedData);
        this.importMappings.set(Array.from(onbekendeMentoren).map(naam => ({
          bronNaam: naam,
          gekozenAfkorting: ''
        })));
        this.showMappingModal.set(true);
      } else {
        this.pendingImportData.set(parsedData);
        await this.processImport();
      }
      
      input.value = '';
    };
    reader.readAsText(file);
  }


  downloadTemplate() {
    downloadCsv('leerlingen_template.csv', [
      ['leerlingnummer', 'leerling', 'klas', 'mentorAfkorting', 'mentorNaam', 'mentorEmail', 'schooljaar', 'actief'],
      ['114334', 'Dae Aartsen', '2HJ', 'kar', 'Rumeysa Karaarslan', 'rkaraarslan@emmauscollege.nl', '2026-2027', 'true']
    ], ',');
  }

  closeForm() {
    this.showForm.set(false);
  }

  edit(item: any) {
    this.form.patchValue({
      leerlingnummer: item.leerlingnummer,
      leerling: item.leerling,
      klas: item.klas,
      mentorAfkorting: item.mentorAfkorting ? normaliseerAfkorting(item.mentorAfkorting) : '',
      mentorNaam: item.mentorNaam || '',
      mentorEmail: item.mentorEmail || '',
      schooljaar: item.schooljaar || '2026-2027',
      actief: item.actief !== false,
    });
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
    
    const val = { ...this.form.value } as any;
    const rawAfk = (val.mentorAfkorting || '').trim();

    if (rawAfk) {
      if (!afkortingIsGeldig(rawAfk)) {
        alert('De gekozen docentafkorting is ongeldig.');
        return;
      }
      const norm = normaliseerAfkorting(rawAfk);
      const docent = this.docenten().find(d => zelfdeAfkorting(d.afkorting, norm));
      if (!docent) {
        alert(`Docent met afkorting "${norm}" niet gevonden in het docentenbestand. Onbekende afkorting geweigerd.`);
        return;
      }
      if (!docent.actief) {
        alert(`Docent "${docent.naam}" (${toonAfkorting(norm)}) is inactief.`);
        return;
      }
      val.mentorAfkorting = norm;
      val.mentorNaam = docent.naam;
    } else {
      val.mentorAfkorting = '';
      val.mentorNaam = '';
      val.mentorEmail = '';
    }

    const id = this.editingId();
    if (id) {
      this.dataService.updateLeerling(id, val);
    } else {
      this.dataService.addLeerling(val);
    }
    
    this.closeForm();
  }
}

