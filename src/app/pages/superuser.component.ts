import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccessCode, UserRole } from '../models/data.models';
import { MatIconModule } from '@angular/material/icon';
import { parseCsv, downloadCsv, headersMatch } from '../utils/csv';
import { collection, addDoc, setDoc, onSnapshot, query, orderBy, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Melding } from '../utils/opslag';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-superuser',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50">
      <header class="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Superuser Omgeving</h2>
          <p class="text-xs text-slate-500">Toegangscodes genereren en beheren</p>
        </div>
        <div class="flex items-center gap-2">
           <button (click)="downloadTemplate()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-slate-700 border border-slate-300 rounded-md font-medium shadow-sm hover:bg-slate-50 transition-all">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">download</mat-icon> Template
           </button>
           <input type="file" accept=".csv" #csvInput class="hidden" (change)="onFileSelected($event)">
           <button (click)="csvInput.click()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-slate-600 border border-slate-300 rounded-md font-medium shadow-sm hover:bg-slate-50 transition-all">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">upload_file</mat-icon> Importeer
           </button>
           <button (click)="showCreate.set(true)" class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#e87700] text-white rounded-md font-medium shadow-sm hover:shadow-md transition-all active:scale-95">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">add</mat-icon> Code maken
           </button>
        </div>
      </header>

      @if (melding(); as m) {
        <div class="m-8 mb-0 p-4 rounded-xl flex items-start gap-3 border shadow-sm transition-all"
             [class.bg-emerald-50]="m.soort === 'ok'" [class.text-emerald-800]="m.soort === 'ok'" [class.border-emerald-200]="m.soort === 'ok'"
             [class.bg-amber-50]="m.soort === 'wacht'" [class.text-amber-900]="m.soort === 'wacht'" [class.border-amber-200]="m.soort === 'wacht'"
             [class.bg-red-50]="m.soort === 'fout'" [class.text-red-800]="m.soort === 'fout'" [class.border-red-200]="m.soort === 'fout'">
          <mat-icon [class.text-emerald-500]="m.soort === 'ok'" [class.text-amber-500]="m.soort === 'wacht'" [class.text-red-500]="m.soort === 'fout'">
            {{ m.soort === 'ok' ? 'check_circle' : m.soort === 'wacht' ? 'hourglass_top' : 'error' }}
          </mat-icon>
          <div class="flex-1">
            <p class="font-bold">{{ m.soort === 'ok' ? 'Gelukt' : m.soort === 'wacht' ? 'Bezig' : 'Fout' }}</p>
            <p class="text-sm">{{ m.tekst }}</p>
          </div>
          <button (click)="melding.set(null)" class="text-slate-400 hover:text-slate-600">
            <mat-icon class="text-[18px]">close</mat-icon>
          </button>
        </div>
      }

      <div class="flex-1 p-8 overflow-y-auto">
        <div class="max-w-6xl mx-auto space-y-8">

          <!-- Superuser Code Banner / Card -->
          <div class="bg-gradient-to-br from-purple-950 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg border border-purple-500/30 relative overflow-hidden">
            <div class="absolute -right-6 -bottom-6 opacity-10 pointer-events-none text-purple-200">
              <mat-icon class="text-[170px] w-[170px] h-[170px]">admin_panel_settings</mat-icon>
            </div>

            <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div class="space-y-2">
                <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/30 border border-purple-400/30 text-purple-200 text-xs font-semibold">
                  <mat-icon class="text-[15px] w-[15px] h-[15px]">verified_user</mat-icon>
                  Superuser Beheerderstoegang
                </div>
                <h3 class="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Actieve Superuser Toegangscode
                </h3>
                <p class="text-xs sm:text-sm text-purple-200/80 max-w-xl leading-relaxed">
                  Deze code geeft volledige beheerdersrechten (superuser) binnen de applicatie. Hiermee kunnen alle instellingen, leerlinggegevens en toegangscodes worden beheerd.
                </p>
              </div>

              <!-- Actieve Superuser Codes Weergave -->
              <div class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                @if (superuserCodes().length > 0) {
                  @for (sCode of superuserCodes(); track sCode.id) {
                    <div class="bg-white/10 backdrop-blur-md border border-purple-300/30 rounded-xl px-5 py-4 flex items-center justify-between gap-5 shadow-inner">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="text-[11px] uppercase font-bold tracking-widest text-purple-200">
                            {{ sCode.ownerName }}
                          </span>
                          @if (auth.currentUser()?.code === sCode.code) {
                            <span class="px-2 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500 text-white tracking-wide">
                              Huidige sessie
                            </span>
                          }
                        </div>
                        <div class="text-xs text-purple-300/80">{{ sCode.ownerEmail }}</div>
                        <div class="font-mono text-2xl sm:text-3xl font-black text-amber-300 tracking-wider select-all mt-1">
                          {{ sCode.code }}
                        </div>
                      </div>
                      <button
                        (click)="copyCode(sCode.code)"
                        class="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                        title="Kopieer superuser-code naar klembord">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">content_copy</mat-icon>
                        <span>Kopiëren</span>
                      </button>
                    </div>
                  }
                } @else {
                  <div class="bg-amber-500/20 border border-amber-400/30 rounded-xl p-4 flex items-center gap-3">
                    <mat-icon class="text-amber-300">warning</mat-icon>
                    <div class="text-xs text-amber-100">
                      Geen actieve superuser-code in Firestore gevonden.
                    </div>
                    <button
                      (click)="openCreateSuperuserModal()"
                      class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow">
                      Aanmaken
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
          
          <!-- Quick stats -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="p-6 bg-white border border-purple-200 rounded-2xl shadow-sm">
              <div class="text-xs font-bold text-purple-700 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <mat-icon class="text-[15px] w-[15px] h-[15px]">admin_panel_settings</mat-icon>
                Superusers
              </div>
              <div class="text-3xl font-black text-purple-800">{{ filterByRole('Superuser').length }}</div>
            </div>
            <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Totaal Actieve Codes</div>
              <div class="text-3xl font-black text-[#1b2a47]">{{ codes().length }}</div>
            </div>
             <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Vakdocenten</div>
              <div class="text-3xl font-black text-blue-600">{{ filterByRole('Docent').length }}</div>
            </div>
             <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Mentoren / Coörd.</div>
              <div class="text-3xl font-black text-emerald-600">{{ filterByRole('Mentor').length + filterByRole('Coordinator').length }}</div>
            </div>
          </div>

          <!-- Codes Table -->
          <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 class="font-bold text-slate-700">Gegenereerde Codes</h3>
                <div class="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button 
                    (click)="selectedRoleFilter.set('ALLE')" 
                    [class.bg-[#1b2a47]]="selectedRoleFilter() === 'ALLE'"
                    [class.text-white]="selectedRoleFilter() === 'ALLE'"
                    [class.bg-white]="selectedRoleFilter() !== 'ALLE'"
                    [class.text-slate-600]="selectedRoleFilter() !== 'ALLE'"
                    class="px-2.5 py-1 text-xs rounded-md font-semibold border border-slate-200 transition-all cursor-pointer">
                    Alles ({{ codes().length }})
                  </button>
                  <button 
                    (click)="selectedRoleFilter.set('Superuser')" 
                    [class.bg-purple-700]="selectedRoleFilter() === 'Superuser'"
                    [class.text-white]="selectedRoleFilter() === 'Superuser'"
                    [class.bg-purple-50]="selectedRoleFilter() !== 'Superuser'"
                    [class.text-purple-800]="selectedRoleFilter() !== 'Superuser'"
                    class="px-2.5 py-1 text-xs rounded-md font-semibold border border-purple-200 transition-all flex items-center gap-1 cursor-pointer">
                    <mat-icon class="text-[13px] w-[13px] h-[13px]">admin_panel_settings</mat-icon>
                    Superuser ({{ filterByRole('Superuser').length }})
                  </button>
                  <button 
                    (click)="selectedRoleFilter.set('Docent')" 
                    [class.bg-blue-600]="selectedRoleFilter() === 'Docent'"
                    [class.text-white]="selectedRoleFilter() === 'Docent'"
                    [class.bg-white]="selectedRoleFilter() !== 'Docent'"
                    [class.text-blue-700]="selectedRoleFilter() !== 'Docent'"
                    class="px-2.5 py-1 text-xs rounded-md font-semibold border border-slate-200 transition-all cursor-pointer">
                    Docenten ({{ filterByRole('Docent').length }})
                  </button>
                  <button 
                    (click)="selectedRoleFilter.set('Mentor')" 
                    [class.bg-emerald-600]="selectedRoleFilter() === 'Mentor'"
                    [class.text-white]="selectedRoleFilter() === 'Mentor'"
                    [class.bg-white]="selectedRoleFilter() !== 'Mentor'"
                    [class.text-emerald-700]="selectedRoleFilter() !== 'Mentor'"
                    class="px-2.5 py-1 text-xs rounded-md font-semibold border border-slate-200 transition-all cursor-pointer">
                    Mentoren ({{ filterByRole('Mentor').length }})
                  </button>
                  <button 
                    (click)="selectedRoleFilter.set('Coordinator')" 
                    [class.bg-orange-600]="selectedRoleFilter() === 'Coordinator'"
                    [class.text-white]="selectedRoleFilter() === 'Coordinator'"
                    [class.bg-white]="selectedRoleFilter() !== 'Coordinator'"
                    [class.text-orange-700]="selectedRoleFilter() !== 'Coordinator'"
                    class="px-2.5 py-1 text-xs rounded-md font-semibold border border-slate-200 transition-all cursor-pointer">
                    Coördinatoren ({{ filterByRole('Coordinator').length }})
                  </button>
                </div>
              </div>
              <div class="flex items-center gap-4">
                 <input 
                  [value]="searchQuery()"
                  (input)="onSearchInput($event)"
                  placeholder="Zoeken op code, naam of mail..." 
                  class="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e87700]/20 w-full sm:w-64">
              </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-4">Code</th>
                    <th class="px-6 py-4">Naam / Email</th>
                    <th class="px-6 py-4">Rol</th>
                    <th class="px-6 py-4">Vak</th>
                    <th class="px-6 py-4">Gemaakt op</th>
                    <th class="px-6 py-4 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (code of filteredCodes(); track code.id) {
                    <tr class="hover:bg-slate-50 transition-colors" [class.bg-purple-50/40]="code.role === 'Superuser'">
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          <span class="font-mono font-bold text-base" [class.text-purple-700]="code.role === 'Superuser'" [class.text-[#e87700]]="code.role !== 'Superuser'">{{ code.code }}</span>
                          <button (click)="copyCode(code.code)" class="text-slate-400 hover:text-purple-700 transition-colors cursor-pointer" title="Kopiëren">
                            <mat-icon class="text-[16px] w-[16px] h-[16px]">content_copy</mat-icon>
                          </button>
                          @if (code.role === 'Superuser') {
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">Superuser</span>
                          }
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="font-bold text-slate-800">{{ code.ownerName }}</div>
                        <div class="text-xs text-slate-500">{{ code.ownerEmail }}</div>
                      </td>
                      <td class="px-6 py-4">
                        <span [class]="getRoleClass(code.role)" class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                          {{ code.role }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-slate-600 italic">{{ code.vak || '-' }}</td>
                      <td class="px-6 py-4 text-slate-400 text-xs">{{ code.createdAt | date:'dd-MM HH:mm' }}</td>
                      <td class="px-6 py-4 text-right">
                        @if (code.role === 'Superuser') {
                          <span class="text-xs font-semibold text-purple-700 bg-purple-100/80 border border-purple-200 px-2 py-1 rounded">Beheerder</span>
                        } @else {
                          <button (click)="promptDeleteCode(code)" class="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Code verwijderen">
                            <mat-icon class="text-[18px] w-[18px] h-[18px]">delete</mat-icon>
                          </button>
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-6 py-20 text-center text-slate-400 italic">Geen codes gevonden.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <!-- Database Schonen Paneel -->
          <div class="bg-white border border-red-200 rounded-2xl shadow-sm p-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-red-900 flex items-center gap-2">
                  <mat-icon class="text-red-600">cleaning_services</mat-icon>
                  Testdata & Ruis Schonen
                </h3>
                <p class="text-xs text-slate-600 mt-1 max-w-2xl">
                  Wist alle testleerlingen, testtaken, testmemo's en niet-superuser codes uit Firestore. De actieve Superuser-toegangscode blijft te allen tijde behouden.
                </p>
              </div>
              <button (click)="showCleanupConfirm.set(true)" class="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 shadow-sm">
                <mat-icon class="text-[16px]">delete_forever</mat-icon>
                Testdata Opschonen
              </button>
            </div>
          </div>

        </div>
      </div>

      <!-- Delete Confirmation Modal -->
      @if (codeToDelete(); as c) {
        <div class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <div class="flex items-start gap-4 mb-4">
              <div class="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                <mat-icon class="text-2xl">warning</mat-icon>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">Toegangscode verwijderen</h3>
                <p class="text-sm text-slate-600 mt-1">
                  Weet je zeker dat je de code van <strong>{{ c.ownerName }}</strong> (<span class="font-mono text-[#e87700]">{{ c.code }}</span>) wilt verwijderen?
                  De gebruiker kan daarna niet meer inloggen met deze code.
                </p>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button (click)="codeToDelete.set(null)" [disabled]="isDeleting()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors">
                Annuleren
              </button>
              <button (click)="confirmDeleteCode()" [disabled]="isDeleting()" class="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                @if (isDeleting()) {
                  <mat-icon class="animate-spin text-[16px]">refresh</mat-icon>
                } @else {
                  <mat-icon class="text-[16px]">delete</mat-icon>
                }
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Cleanup Confirm Modal -->
      @if (showCleanupConfirm()) {
        <div class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <div class="flex items-start gap-4 mb-4">
              <div class="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                <mat-icon class="text-2xl">delete_sweep</mat-icon>
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">Database Testdata Schonen</h3>
                <p class="text-sm text-slate-600 mt-2 leading-relaxed">
                  Dit verwijdert alle ingevoerde testdata: leerlingen, gekoppelde docenten/vakken, taken, memo's en voortgangsplannen.
                  <br><br>
                  <strong class="text-purple-700">De Superuser-toegangscode wordt behouden</strong>, zodat je toegang tot dit beheerpaneel niet verliest.
                </p>
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button (click)="showCleanupConfirm.set(false)" [disabled]="isCleaning()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors">
                Annuleren
              </button>
              <button (click)="executeCleanup()" [disabled]="isCleaning()" class="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-2">
                @if (isCleaning()) {
                  <mat-icon class="animate-spin text-[16px]">refresh</mat-icon> Bezig met schonen...
                } @else {
                  <mat-icon class="text-[16px]">check</mat-icon> Ja, schonen
                }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Create Modal -->
      @if (showCreate()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div class="p-8">
              <h3 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <mat-icon class="text-[#e87700]">add_circle</mat-icon>
                Nieuwe code maken
              </h3>

              <div class="space-y-4">
                <div>
                  <label for="role-select" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rol</label>
                  <select id="role-select" [value]="newCodeRole()" (change)="onRoleChange($event)" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20">
                    <option value="Docent">Vakdocent</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Coordinator">Leerlingcoördinator</option>
                    <option value="Superuser">Superuser (Beheerder)</option>
                  </select>
                </div>

                <div>
                  <label for="name-input" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Naam</label>
                  <input id="name-input" [value]="newCodeName()" (input)="onNameInput($event)" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20" placeholder="Bijv. Jan de Vries">
                </div>

                <div>
                  <label for="email-input" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</label>
                  <input id="email-input" [value]="newCodeEmail()" (input)="onEmailInput($event)" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20" placeholder="E-mailadres">
                </div>

                @if (newCodeRole() === 'Docent') {
                  <div>
                    <label for="vak-input" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vak</label>
                    <input id="vak-input" [value]="newCodeVak()" (input)="onVakInput($event)" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20" placeholder="Bijv. Wiskunde">
                  </div>
                }

                <div class="pt-4 flex gap-3">
                  <button (click)="showCreate.set(false)" class="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">Annuleren</button>
                  <button 
                    (click)="createCode()" 
                    [disabled]="!isValid()"
                    class="flex-2 py-3 bg-[#e87700] text-white rounded-xl font-bold shadow-lg shadow-[#e87700]/20 hover:bg-[#ff8a00] transition-all disabled:opacity-50">
                    Genereren
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- CSV Preview Modal -->
      @if (csvPreviewData()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div class="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 class="text-xl font-bold text-slate-900">Importeer Codes (CSV)</h3>
                <p class="text-sm text-slate-600 mt-1">Controleer de in te lezen medewerkers voordat je deze opslaat.</p>
              </div>
              <button (click)="cancelImport()" class="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="flex-1 overflow-auto p-0">
              <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-slate-100 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th class="px-4 py-3 border-b border-slate-200">Email</th>
                    <th class="px-4 py-3 border-b border-slate-200">Naam</th>
                    <th class="px-4 py-3 border-b border-slate-200">Rol</th>
                    <th class="px-4 py-3 border-b border-slate-200">Vak</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (row of csvPreviewData(); track row.ownerEmail) {
                    <tr class="hover:bg-slate-50">
                      <td class="px-4 py-3 text-slate-600">{{ row.ownerEmail }}</td>
                      <td class="px-4 py-3 font-medium text-slate-900">{{ row.ownerName }}</td>
                      <td class="px-4 py-3 text-blue-600 font-medium">{{ row.role }}</td>
                      <td class="px-4 py-3 text-slate-500">{{ row.vak || '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <div class="text-sm font-medium text-slate-600">
                Totaal te genereren: <span class="font-bold text-slate-900">{{ csvPreviewData()?.length }} codes</span>
              </div>
              <div class="flex gap-3">
                <button (click)="cancelImport()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors">Annuleren</button>
                <button (click)="confirmImport()" class="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-2">
                  <mat-icon class="text-[18px]">save</mat-icon>
                  Bevestig & Genereer
                </button>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class SuperuserComponent {
  auth = inject(AuthService);
  codes = signal<AccessCode[]>([]);
  searchQuery = signal('');
  selectedRoleFilter = signal<string>('ALLE');
  showCreate = signal(false);
  csvPreviewData = signal<any[] | null>(null);
  melding = signal<Melding | null>(null);

  superuserCodes = computed(() => this.codes().filter(c => c.role === 'Superuser'));

  // Delete modal state
  codeToDelete = signal<AccessCode | null>(null);
  isDeleting = signal(false);

  // Cleanup state
  showCleanupConfirm = signal(false);
  isCleaning = signal(false);

  newCodeRole = signal<UserRole>('Docent');
  newCodeName = signal('');
  newCodeEmail = signal('');
  newCodeVak = signal('');

  downloadTemplate() {
    downloadCsv('Template_AccessCodes.csv', [
      ['Email', 'Naam', 'Rol', 'Vak'],
      ['j.devries@school.nl', 'Jan de Vries', 'Docent', 'Wiskunde'],
      ['m.pietersen@school.nl', 'Marieke Pietersen', 'Mentor', ''],
      ['p.jansen@school.nl', 'Peter Jansen', 'Coordinator', '']
    ]);
  }

  onSearchInput(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onRoleChange(event: Event) {
    this.newCodeRole.set((event.target as HTMLSelectElement).value as UserRole);
  }

  onNameInput(event: Event) {
    this.newCodeName.set((event.target as HTMLInputElement).value);
  }

  onEmailInput(event: Event) {
    this.newCodeEmail.set((event.target as HTMLInputElement).value);
  }

  onVakInput(event: Event) {
    this.newCodeVak.set((event.target as HTMLInputElement).value);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length < 1) return;

      const expectedHeaders = ['Email', 'Naam', 'Rol', 'Vak'];

      if (!headersMatch(rows[0], expectedHeaders)) {
        this.melding.set({
          soort: 'fout',
          tekst: 'Kolomnamen komen niet overeen met het sjabloon (verwacht: Email, Naam, Rol, Vak).'
        });
        event.target.value = '';
        return;
      }

      const rowsToImport = [];
      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i];
        if (columns.length < 3) continue;

        const email = columns[0];
        const naam = columns[1];
        const rol = columns[2] as UserRole;
        const vak = columns[3] || '';

        if (!email || !naam || !['Docent', 'Mentor', 'Coordinator'].includes(rol)) {
            continue;
        }

        rowsToImport.push({
          ownerEmail: email,
          ownerName: naam,
          role: rol,
          vak: vak
        });
      }

      if (rowsToImport.length > 0) {
        this.csvPreviewData.set(rowsToImport);
      } else {
        this.melding.set({ soort: 'fout', tekst: 'Geen geldige rijen gevonden in het CSV-bestand.' });
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
    if (!data) return;
    
    let successCount = 0;
    const batch = writeBatch(db);

    for (const row of data) {
      const code = this.generateCode();
      const codeRef = doc(db, 'codes', code);
      const newCode: any = {
        id: code,
        code,
        role: row.role,
        ownerName: row.ownerName,
        ownerEmail: row.ownerEmail,
        createdAt: new Date().toISOString(),
        used: false
      };

      if (row.role === 'Docent') {
        newCode.vak = row.vak;
      }

      batch.set(codeRef, newCode);
      successCount++;
    }

    try {
      await batch.commit();
      this.melding.set({ soort: 'ok', tekst: `${successCount} toegangscodes succesvol gegenereerd en opgeslagen.` });
    } catch (e: any) {
      console.error('Failed to create codes batch', e);
      this.melding.set({ soort: 'fout', tekst: 'Fout bij opslaan van codes: ' + (e.message || String(e)) });
    }

    this.csvPreviewData.set(null);
  }

  filteredCodes = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const roleFilter = this.selectedRoleFilter();
    return this.codes()
      .filter(c => {
        if (roleFilter !== 'ALLE' && c.role !== roleFilter) return false;
        return (
          !q ||
          (c.ownerName && c.ownerName.toLowerCase().includes(q)) || 
          (c.ownerEmail && c.ownerEmail.toLowerCase().includes(q)) || 
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.vak && c.vak.toLowerCase().includes(q))
        );
      })
      .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  });

  openCreateSuperuserModal() {
    this.newCodeRole.set('Superuser');
    this.newCodeName.set('');
    this.newCodeEmail.set('');
    this.newCodeVak.set('');
    this.showCreate.set(true);
  }

  constructor() {
    onSnapshot(query(collection(db, 'codes'), orderBy('createdAt', 'desc')), (snapshot) => {
      this.codes.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AccessCode)));
    });
  }

  copyCode(code: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.melding.set({ soort: 'ok', tekst: `Code ${code} gekopieerd naar klembord.` });
      }).catch(() => {
        this.melding.set({ soort: 'fout', tekst: 'Kopiëren naar klembord mislukt.' });
      });
    } else {
      this.melding.set({ soort: 'fout', tekst: 'Klembord wordt niet ondersteund in deze browser.' });
    }
  }

  isValid() {
    return this.newCodeName() && this.newCodeEmail() && (this.newCodeRole() !== 'Docent' || this.newCodeVak());
  }

  filterByRole(role: UserRole) {
    return this.codes().filter(c => c.role === role);
  }

  getRoleClass(role: UserRole) {
    switch(role) {
      case 'Superuser': return 'bg-purple-100 text-purple-700';
      case 'Docent': return 'bg-blue-100 text-blue-700';
      case 'Mentor': return 'bg-emerald-100 text-emerald-700';
      case 'Coordinator': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  async createCode() {
    if (!this.isValid()) return;

    const code = this.generateCode();
    const newCode: any = {
      code,
      role: this.newCodeRole(),
      ownerName: this.newCodeName(),
      ownerEmail: this.newCodeEmail(),
      createdAt: new Date().toISOString(),
      used: false
    };

    if (this.newCodeRole() === 'Docent') {
      newCode.vak = this.newCodeVak();
    }

    try {
      await setDoc(doc(db, 'codes', code), { ...newCode, id: code });
      this.showCreate.set(false);
      this.resetForm();
      this.melding.set({ soort: 'ok', tekst: `Toegangscode ${code} is succesvol gegenereerd!` });
    } catch (e: any) {
      console.error('Failed to create code', e);
      this.melding.set({ soort: 'fout', tekst: 'Fout bij aanmaken code: ' + (e.message || String(e)) });
    }
  }

  promptDeleteCode(code: AccessCode) {
    this.codeToDelete.set(code);
  }

  async confirmDeleteCode() {
    const code = this.codeToDelete();
    if (!code || !code.id) return;

    if (code.role === 'Superuser') {
      this.melding.set({ soort: 'fout', tekst: 'Een Superuser-code kan niet worden verwijderd om buitensluiting te voorkomen.' });
      this.codeToDelete.set(null);
      return;
    }

    this.isDeleting.set(true);
    try {
      await deleteDoc(doc(db, 'codes', code.id));
      this.melding.set({ soort: 'ok', tekst: `Toegangscode voor ${code.ownerName} is verwijderd.` });
      this.codeToDelete.set(null);
    } catch (e: any) {
      console.error('Delete code error:', e);
      this.melding.set({ soort: 'fout', tekst: 'Fout bij verwijderen: ' + (e.message || String(e)) });
    } finally {
      this.isDeleting.set(false);
    }
  }

  async executeCleanup() {
    this.isCleaning.set(true);
    try {
      const collectionsToClean = [
        'leerlingen',
        'docentenVakken',
        'docentTaken',
        'memoTW1TW2',
        'memoTW3',
        'mentorVoorbereiding',
        'voortgangsplan'
      ];

      for (const collName of collectionsToClean) {
        const snap = await getDocs(collection(db, collName));
        const BUNDLE = 400;
        for (let i = 0; i < snap.docs.length; i += BUNDLE) {
          const b = writeBatch(db);
          for (const d of snap.docs.slice(i, i + BUNDLE)) {
            b.delete(doc(db, collName, d.id));
          }
          await b.commit();
        }
      }

      // Codes (keep Superuser)
      const codesSnap = await getDocs(collection(db, 'codes'));
      const codesBatch = writeBatch(db);
      let codesToDeleteCount = 0;
      for (const d of codesSnap.docs) {
        if (d.data()['role'] !== 'Superuser') {
          codesBatch.delete(doc(db, 'codes', d.id));
          codesToDeleteCount++;
        }
      }
      if (codesToDeleteCount > 0) {
        await codesBatch.commit();
      }

      this.showCleanupConfirm.set(false);
      this.melding.set({ soort: 'ok', tekst: 'Database is succesvol geschoond. De Superuser-code is behouden.' });
    } catch (e: any) {
      console.error('Cleanup failed:', e);
      this.melding.set({ soort: 'fout', tekst: 'Fout bij schonen: ' + (e.message || String(e)) });
    } finally {
      this.isCleaning.set(false);
    }
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const part = () => Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part()}-${part()}`;
  }

  private resetForm() {
    this.newCodeName.set('');
    this.newCodeEmail.set('');
    this.newCodeVak.set('');
    this.newCodeRole.set('Docent');
  }
}

