import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { wachtOpOpslag, Melding, MELDING_BEVESTIGD, MELDING_WACHT, meldingBijFout } from '../utils/opslag';
import { MemoTW1TW2, MemoTW3 } from '../models/data.models';

export type DocentMemo = MemoTW1TW2 | MemoTW3;

@Component({
  selector: 'app-mentor-prep',
  imports: [ReactiveFormsModule, MatIconModule, CommonModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative print:bg-white">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 print:hidden hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Voorbereiding Rapportvergadering</h2>
        <div class="flex gap-2">
          <button type="button" (click)="printPage()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition-all flex items-center gap-1.5 shadow-sm">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">print</mat-icon>
            <span class="hidden md:inline">Print</span>
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
            <p class="text-lg font-bold text-slate-600">Voorbereiding Rapportvergadering - {{ form.value.periode }}</p>
            <p class="text-md font-bold text-slate-500">{{ selectedLeerling()?.leerling }} ({{ selectedLeerling()?.leerlingnummer }})</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold">{{ form.value.schooljaar }}</p>
            <p class="text-xs text-slate-500">{{ today | date:'dd-MM-yyyy' }}</p>
          </div>
        </div>
      </div>

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

      <div class="flex-1 p-4 sm:p-8 print:p-0">
        <form [formGroup]="form" class="flex flex-col lg:flex-row gap-6 print:block">
          
          <!-- Formulier Inhoud Mentor -->
          <div class="flex-1 flex flex-col gap-6 min-w-0 transition-all duration-300">
            <section class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:mb-6">
              <h3 class="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wide print:text-slate-800">Leerling Selectie</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-2">
                <div class="print:mb-4">
                  <label for="mp-schooljaar" class="block text-xs font-semibold text-slate-600 mb-1">Schooljaar</label>
                  <input id="mp-schooljaar" type="text" formControlName="schooljaar" readonly class="w-full p-2 text-sm border border-slate-300 bg-slate-100 text-slate-500 rounded cursor-not-allowed outline-none print:bg-white">
                </div>
                <div class="print:mb-4">
                  <label for="mp-periode" class="block text-xs font-semibold text-slate-600 mb-1">Periode *</label>
                  <select id="mp-periode" formControlName="periode" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                    <option value="TW1">TW1</option>
                    <option value="TW2">TW2</option>
                    <option value="TW3">TW3</option>
                  </select>
                </div>
                <div class="print:mb-4">
                  <label for="mp-klas" class="block text-xs font-semibold text-slate-600 mb-1">Klas *</label>
                  <select id="mp-klas" formControlName="klas" (change)="onKlasChange()" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                    <option value="">-- Kies --</option>
                    @for (k of availableKlassen(); track k) {
                      <option [value]="k">{{k}}</option>
                    }
                  </select>
                </div>
                <div class="print:mb-4">
                  <label for="mp-leerlingnummer" class="block text-xs font-semibold text-slate-600 mb-1">Leerling *</label>
                  <select id="mp-leerlingnummer" formControlName="leerlingnummer" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" [attr.disabled]="!form.value.klas ? true : null" [class.bg-slate-100]="!form.value.klas">
                    <option value="">-- Kies --</option>
                    @for (l of filteredLeerlingen(); track l.id) {
                      <option [value]="l.leerlingnummer">{{l.leerling}} ({{l.leerlingnummer}})</option>
                    }
                  </select>
                </div>
              </div>
            </section>

            <section class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 print:shadow-none print:border-slate-300 print:mb-6" [class.opacity-50]="!form.value.leerlingnummer" [class.pointer-events-none]="!form.value.leerlingnummer">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wide print:text-slate-800">Inhoud Voorbereiding (Mentor)</h3>
                @if (loadedMemos().length > 0) {
                  <button type="button" (click)="overnemenSignalenUitMemos()" class="text-xs text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors" title="Voeg samenvatting van docentmemo's toe aan de signalen">
                    <mat-icon class="text-[15px] w-[15px] h-[15px]">playlist_add</mat-icon>
                    Signalen uit memo's overnemen
                  </button>
                }
              </div>
              
              <div class="print:mb-4">
                <label for="mp-overzichtResultaten" class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Overzicht resultaten</label>
                <textarea id="mp-overzichtResultaten" formControlName="overzichtResultaten" placeholder="Vul hier de algemene leerresultaten en cijfermatige context in..." class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0"></textarea>
              </div>
              <div class="print:mb-4">
                <div class="flex justify-between items-center mb-2">
                  <label for="mp-belangrijksteSignalenUitMemos" class="block text-xs font-bold text-slate-400 uppercase print:text-slate-800">Belangrijkste signalen uit memo's</label>
                  <span class="text-[11px] text-slate-400">Wordt door mentor ingevuld / samengevat</span>
                </div>
                <textarea id="mp-belangrijksteSignalenUitMemos" formControlName="belangrijksteSignalenUitMemos" placeholder="Vat hier de rode draad uit de vakdocentmemo's samen..." class="w-full h-28 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[5rem] print:h-auto print:border-0 print:p-0"></textarea>
              </div>
              <div class="print:mb-4">
                <label for="mp-aandachtspuntenPersoonlijkeAchtergrond" class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Aandachtspunten persoonlijke achtergrond</label>
                <textarea id="mp-aandachtspuntenPersoonlijkeAchtergrond" formControlName="aandachtspuntenPersoonlijkeAchtergrond" placeholder="Relevante achtergrondinformatie, thuissituatie of welzijn..." class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0"></textarea>
              </div>
              <div class="print:mb-4">
                <label for="mp-centraleBespreekvragen" class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Centrale bespreekvraag of -vragen</label>
                <textarea id="mp-centraleBespreekvragen" formControlName="centraleBespreekvragen" placeholder="Welke centrale vraag leggen we voor aan de vergadering?" class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0"></textarea>
              </div>
              
              <div class="bg-slate-100 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between border border-slate-200 gap-4 mt-4 print:bg-white print:border-slate-300 print:mt-4">
               <div class="flex items-center gap-4 w-full justify-between">
                 <div class="flex items-center">
                   <span class="text-xs font-bold text-slate-500 uppercase mr-3 print:text-slate-800">Status Voorbereiding:</span>
                   <select formControlName="status" class="px-3 py-1 bg-yellow-100/50 text-slate-800 text-xs font-bold rounded-full border-0 focus:ring-0 cursor-pointer uppercase print:appearance-none print:bg-transparent print:p-0">
                     <option value="Concept">Concept</option>
                     <option value="Definitief">Definitief</option>
                   </select>
                 </div>
                 
                 <div class="sm:hidden flex gap-2 print:hidden">
                   <button type="button" (click)="submitFinal()" [disabled]="bezig()" class="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-sm transition-colors">Opslaan</button>
                 </div>
               </div>
              </div>
            </section>
          </div>

          <!-- Uitklapbare Zijbalk met Docentmemo's -->
          <aside [class]="'print:hidden transition-all duration-300 shrink-0 ' + (sidebarOpen() ? 'w-full lg:w-96 xl:w-112' : 'w-auto')">
            @if (sidebarOpen()) {
              <div class="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full min-h-[500px]">
                <div class="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between rounded-t-xl">
                  <div class="flex items-center gap-2">
                    <mat-icon class="text-blue-600 text-[20px] w-[20px] h-[20px]">feed</mat-icon>
                    <h4 class="font-bold text-slate-800 text-sm">
                      Docentmemo's
                      <span class="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-bold">{{ loadedMemos().length }}</span>
                    </h4>
                  </div>
                  <div class="flex items-center gap-1">
                    @if (form.value.leerlingnummer) {
                      <button type="button" (click)="openCreateMemoModal()" class="px-2 py-1 text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded shadow-xs flex items-center gap-1 transition-colors" title="Voeg memo toe namens docent">
                        <mat-icon class="text-[14px] w-[14px] h-[14px]">add</mat-icon>
                        <span class="hidden sm:inline">Toevoegen</span>
                      </button>
                    }
                    <button type="button" (click)="sidebarOpen.set(false)" class="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors" title="Zijbalk inklappen">
                      <mat-icon class="text-[20px] w-[20px] h-[20px]">chevron_right</mat-icon>
                    </button>
                  </div>
                </div>

                <div class="p-4 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                  @if (!form.value.leerlingnummer) {
                    <div class="p-8 text-center text-slate-400">
                      <mat-icon class="text-4xl mx-auto mb-2 opacity-40">person_search</mat-icon>
                      <p class="text-xs font-medium">Selecteer eerst een klas en leerling om de ingediende memo's van vakdocenten te zien.</p>
                    </div>
                  } @else if (loadedMemos().length === 0) {
                    <div class="p-8 text-center text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                      <mat-icon class="text-4xl mx-auto mb-2 opacity-40">inbox</mat-icon>
                      <p class="text-xs font-medium text-slate-600">Nog geen docentmemo's voor deze periode.</p>
                      <p class="text-[11px] text-slate-400 mt-1">Vakdocenten vullen een memo in voor hun gekoppelde leerling.</p>
                      <button type="button" (click)="openCreateMemoModal()" class="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm inline-flex items-center gap-1.5 transition-colors">
                        <mat-icon class="text-[14px] w-[14px] h-[14px]">add</mat-icon>
                        Memo toevoegen namens docent
                      </button>
                    </div>
                  } @else {
                    @for (m of loadedMemos(); track m.id) {
                      <div class="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col gap-2.5">
                        <div class="flex items-start justify-between gap-2">
                          <div>
                            <span class="inline-block font-bold text-slate-800 text-xs uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{{ m.vak }}</span>
                            <div class="text-xs font-semibold text-slate-700 mt-1">{{ m.docentNaam }}</div>
                            <div class="text-[11px] text-slate-400">{{ m.docentEmail }}</div>
                          </div>
                          <div class="flex flex-col items-end gap-1">
                            <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border"
                                  [class.bg-emerald-50]="m.status === 'Definitief'" [class.text-emerald-700]="m.status === 'Definitief'" [class.border-emerald-200]="m.status === 'Definitief'"
                                  [class.bg-amber-50]="m.status === 'Concept'" [class.text-amber-700]="m.status === 'Concept'" [class.border-amber-200]="m.status === 'Concept'">
                              {{ m.status }}
                            </span>
                            @if (m.gewijzigdDoor) {
                              <span class="text-[9px] text-slate-400" title="Laatst bewerkt door {{ m.gewijzigdDoor }}">aangepast</span>
                            }
                          </div>
                        </div>

                        <!-- Aandachtspunten badges -->
                        <div class="flex flex-wrap gap-1">
                          @if (m.aandachtInhoudelijkBegrip) { <span class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-100">Begrip</span> }
                          @if (m.aandachtPlanningOrganisatie) { <span class="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-medium border border-purple-100">Planning</span> }
                          @if (m.aandachtToetsvoorbereidingLeerstrategie) { <span class="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-medium border border-indigo-100">Toetsvoorbereiding</span> }
                          @if (m.aandachtInzetWerkhouding) { <span class="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-medium border border-amber-100">Werkhouding</span> }
                          @if (m.aandachtWerkNietOpOrde) { <span class="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-medium border border-rose-100">Werk niet op orde</span> }
                          @if (m.aandachtAanwezigheidVerzuim) { <span class="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-medium border border-red-100">Verzuim</span> }
                        </div>

                        <p class="text-slate-600 text-xs line-clamp-3 leading-relaxed bg-slate-50/70 p-2 rounded border border-slate-100">
                          {{ m.waarZieJeDitAan }}
                        </p>

                        <!-- Actieknoppen voor de Mentor: Inzien / Aanpassen / Verwijderen -->
                        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <span class="text-[10px] text-slate-400">
                            {{ m.gewijzigdOp | date:'dd-MM-yy' }}
                          </span>
                          <div class="flex items-center gap-1">
                            <button type="button" (click)="openViewModal(m)" class="px-2 py-1 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded flex items-center gap-1 transition-colors" title="Memo inzien">
                              <mat-icon class="text-[16px] w-[16px] h-[16px]">visibility</mat-icon>
                              <span>Inzien</span>
                            </button>
                            <button type="button" (click)="openEditModal(m)" class="px-2 py-1 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded flex items-center gap-1 transition-colors" title="Memo aanpassen">
                              <mat-icon class="text-[16px] w-[16px] h-[16px]">edit</mat-icon>
                              <span>Aanpassen</span>
                            </button>
                            @if (magVerwijderen()) {
                              <button type="button" (click)="deleteDocentMemo(m)" class="px-1.5 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Memo verwijderen">
                                <mat-icon class="text-[16px] w-[16px] h-[16px]">delete</mat-icon>
                              </button>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  }
                </div>
              </div>
            } @else {
              <!-- Ingeklapte Zijbalk Strip -->
              <div class="flex flex-col items-center">
                <button type="button" (click)="sidebarOpen.set(true)" class="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-3 shadow-sm hover:shadow text-slate-700 hover:text-blue-700 flex flex-col items-center gap-2 transition-all group" title="Zijbalk uitklappen">
                  <mat-icon class="text-blue-600 group-hover:scale-110 transition-transform">chevron_left</mat-icon>
                  <span class="text-xs font-bold tracking-wider uppercase text-slate-600 py-2 [writing-mode:vertical-lr]">
                    Docentmemo's ({{ loadedMemos().length }})
                  </span>
                  <span class="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                    {{ loadedMemos().length }}
                  </span>
                </button>
              </div>
            }
          </aside>
        </form>
      </div>

      <!-- MODAL 1: Inzien Memo -->
      @if (viewingMemo(); as vm) {
        <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 rounded font-bold text-xs bg-blue-100 text-blue-800 uppercase">{{ vm.vak }}</span>
                <h3 class="font-bold text-slate-800 text-base">{{ vm.docentNaam }}</h3>
              </div>
              <button (click)="viewingMemo.set(null)" class="text-slate-400 hover:text-slate-600 rounded-full p-1">
                <mat-icon class="text-[20px] w-[20px] h-[20px]">close</mat-icon>
              </button>
            </div>

            <div class="p-6 overflow-y-auto space-y-4 text-sm text-slate-700 custom-scrollbar">
              <div class="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
                <span>Docent email: <strong>{{ vm.docentEmail }}</strong></span>
                <span class="px-2 py-0.5 rounded-full font-bold uppercase text-[10px] border"
                      [class.bg-emerald-50]="vm.status === 'Definitief'" [class.text-emerald-700]="vm.status === 'Definitief'" [class.border-emerald-200]="vm.status === 'Definitief'"
                      [class.bg-yellow-50]="vm.status === 'Concept'" [class.text-yellow-700]="vm.status === 'Concept'" [class.border-yellow-200]="vm.status === 'Concept'">
                  {{ vm.status }}
                </span>
              </div>

              <div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1.5">Aandachtspunten</span>
                <div class="flex flex-wrap gap-1.5">
                  @if (vm.aandachtInhoudelijkBegrip) { <span class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">Inhoudelijk begrip</span> }
                  @if (vm.aandachtPlanningOrganisatie) { <span class="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs border border-purple-100">Planning / organisatie</span> }
                  @if (vm.aandachtToetsvoorbereidingLeerstrategie) { <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs border border-indigo-100">Toetsvoorbereiding</span> }
                  @if (vm.aandachtInzetWerkhouding) { <span class="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs border border-amber-100">Inzet / werkhouding</span> }
                  @if (vm.aandachtWerkNietOpOrde) { <span class="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-xs border border-rose-100">Werk niet op orde</span> }
                  @if (vm.aandachtAanwezigheidVerzuim) { <span class="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs border border-red-100">Aanwezigheid / verzuim</span> }
                  @if (!vm.aandachtInhoudelijkBegrip && !vm.aandachtPlanningOrganisatie && !vm.aandachtToetsvoorbereidingLeerstrategie && !vm.aandachtInzetWerkhouding && !vm.aandachtWerkNietOpOrde && !vm.aandachtAanwezigheidVerzuim) {
                    <span class="text-slate-400 italic text-xs">Geen specifieke aandachtspunten aangevinkt</span>
                  }
                </div>
              </div>

              <div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Waar zie je dit aan?</span>
                <div class="p-3 bg-slate-50 rounded-lg text-slate-800 whitespace-pre-wrap text-sm border border-slate-200">
                  {{ vm.waarZieJeDitAan || 'Niet ingevuld' }}
                </div>
              </div>

              @if (vm.watWerktWel) {
                <div>
                  <span class="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Wat werkt wel?</span>
                  <div class="p-3 bg-slate-50 rounded-lg text-slate-800 whitespace-pre-wrap text-sm border border-slate-200">
                    {{ vm.watWerktWel }}
                  </div>
                </div>
              }

              @if (asTW3(vm); as tw3) {
                @if (tw3.doorstroomToelichting) {
                  <div>
                    <span class="text-xs font-bold text-blue-700 uppercase tracking-wide block mb-1">Doorstroomtoelichting (TW3)</span>
                    <div class="p-3 bg-blue-50/70 rounded-lg text-blue-900 whitespace-pre-wrap text-sm border border-blue-200">
                      {{ tw3.doorstroomToelichting }}
                    </div>
                  </div>
                }
              }
              @if (asTW12(vm); as tw12) {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  @if (tw12.leerlingActie) {
                    <div>
                      <span class="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Actie leerling</span>
                      <div class="p-2.5 bg-slate-50 rounded-lg text-slate-800 whitespace-pre-wrap text-xs border border-slate-200">
                        {{ tw12.leerlingActie }}
                      </div>
                    </div>
                  }
                  @if (tw12.docentActie) {
                    <div>
                      <span class="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Actie docent</span>
                      <div class="p-2.5 bg-slate-50 rounded-lg text-slate-800 whitespace-pre-wrap text-xs border border-slate-200">
                        {{ tw12.docentActie }}
                      </div>
                    </div>
                  }
                </div>
                @if (tw12.emc) {
                  <div class="flex items-center gap-2 pt-1 text-xs">
                    <span class="font-bold text-slate-500">EMC bespreken:</span>
                    <span class="px-2 py-0.5 rounded font-bold" [class.bg-red-100]="tw12.emc === 'Ja'" [class.text-red-700]="tw12.emc === 'Ja'" [class.bg-slate-100]="tw12.emc !== 'Ja'">{{ tw12.emc }}</span>
                  </div>
                }
              }

              <div class="pt-2 text-[11px] text-slate-400 border-t border-slate-100 flex justify-between">
                <span>Ingevuld: {{ vm.aangemaaktOp | date:'dd-MM-yyyy HH:mm' }}</span>
                @if (vm.gewijzigdDoor) {
                  <span>Aangepast door: {{ vm.gewijzigdDoor }}</span>
                }
              </div>
            </div>

            <div class="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button (click)="openEditModal(vm); viewingMemo.set(null)" class="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors flex items-center gap-1.5">
                <mat-icon class="text-[16px] w-[16px] h-[16px]">edit</mat-icon> Aanpassen als mentor
              </button>
              <button (click)="viewingMemo.set(null)" class="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors">
                Sluiten
              </button>
            </div>
          </div>
        </div>
      }

      <!-- MODAL 2: Aanpassen Memo (door Mentor) -->
      @if (editingMemo(); as em) {
        <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 class="font-bold text-slate-800 text-base">Docentmemo Aanpassen</h3>
                <p class="text-xs text-slate-500">{{ em.vak }} &bull; {{ em.docentNaam }} &bull; Leerling: {{ selectedLeerling()?.leerling }}</p>
              </div>
              <button (click)="editingMemo.set(null)" class="text-slate-400 hover:text-slate-600 rounded-full p-1">
                <mat-icon class="text-[20px] w-[20px] h-[20px]">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="editMemoForm" (ngSubmit)="saveEditedMemo()" class="p-6 overflow-y-auto space-y-4 text-sm custom-scrollbar flex-1">
              <div>
                <label class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Aandachtspunten</label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label class="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-slate-100">
                    <input type="checkbox" formControlName="aandachtInhoudelijkBegrip" class="rounded text-blue-600">
                    <span>Inhoudelijk begrip</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-slate-100">
                    <input type="checkbox" formControlName="aandachtPlanningOrganisatie" class="rounded text-blue-600">
                    <span>Planning / organisatie</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-slate-100">
                    <input type="checkbox" formControlName="aandachtToetsvoorbereidingLeerstrategie" class="rounded text-blue-600">
                    <span>Toetsvoorbereiding</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-slate-100">
                    <input type="checkbox" formControlName="aandachtInzetWerkhouding" class="rounded text-blue-600">
                    <span>Inzet / werkhouding</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-slate-100">
                    <input type="checkbox" formControlName="aandachtWerkNietOpOrde" class="rounded text-blue-600">
                    <span>Werk niet op orde</span>
                  </label>
                  <label class="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer border border-slate-100">
                    <input type="checkbox" formControlName="aandachtAanwezigheidVerzuim" class="rounded text-blue-600">
                    <span>Aanwezigheid / verzuim</span>
                  </label>
                </div>
              </div>

              <div>
                <label for="edit-waarZieJeDitAan" class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Waar zie je dit aan? *</label>
                <textarea id="edit-waarZieJeDitAan" formControlName="waarZieJeDitAan" rows="3" class="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>

              <div>
                <label for="edit-watWerktWel" class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Wat werkt wel?</label>
                <textarea id="edit-watWerktWel" formControlName="watWerktWel" rows="2" class="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>

              @if (isTW3(em)) {
                <div>
                  <label for="edit-doorstroomToelichting" class="block text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Doorstroomtoelichting (TW3)</label>
                  <textarea id="edit-doorstroomToelichting" formControlName="doorstroomToelichting" rows="2" class="w-full p-2.5 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                </div>
              } @else {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label for="edit-leerlingActie" class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Actie leerling</label>
                    <textarea id="edit-leerlingActie" formControlName="leerlingActie" rows="2" class="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                  </div>
                  <div>
                    <label for="edit-docentActie" class="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Actie docent</label>
                    <textarea id="edit-docentActie" formControlName="docentActie" rows="2" class="w-full p-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                  </div>
                </div>
                <div class="flex items-center gap-3 pt-1">
                  <label for="edit-emc" class="text-xs font-bold text-slate-500 uppercase">EMC:</label>
                  <select id="edit-emc" formControlName="emc" class="p-1.5 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    <option [ngValue]="null">-- Geen --</option>
                    <option value="Nee">Nee</option>
                    <option value="Ja">Ja</option>
                  </select>
                </div>
              }

              <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <label for="edit-status" class="text-xs font-bold text-slate-600 uppercase">Status van deze memo:</label>
                <select id="edit-status" formControlName="status" class="px-3 py-1 bg-white text-slate-800 text-xs font-bold rounded-md border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer uppercase">
                  <option value="Concept">Concept</option>
                  <option value="Definitief">Definitief</option>
                </select>
              </div>

              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" (click)="editingMemo.set(null)" class="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors">
                  Annuleren
                </button>
                <button type="submit" [disabled]="bezig()" class="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5">
                  <mat-icon class="text-[16px] w-[16px] h-[16px]">save</mat-icon> Wijzigingen Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL 3: Nieuwe Docentmemo Toevoegen (als Mentor) -->
      @if (showCreateMemoModal()) {
        <div class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div class="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 class="font-bold text-slate-800 text-base">Docentmemo Toevoegen</h3>
                <p class="text-xs text-slate-500">Voor {{ selectedLeerling()?.leerling }} &bull; {{ form.value.periode }}</p>
              </div>
              <button (click)="showCreateMemoModal.set(false)" class="text-slate-400 hover:text-slate-600 rounded-full p-1">
                <mat-icon class="text-[20px] w-[20px] h-[20px]">close</mat-icon>
              </button>
            </div>

            <form [formGroup]="createMemoForm" (ngSubmit)="saveNewDocentMemo()" class="p-6 overflow-y-auto space-y-4 text-sm custom-scrollbar flex-1">
              <div>
                <label for="create-docentVakId" class="block text-xs font-semibold text-slate-600 mb-1">Vakdocent / Vak *</label>
                <select id="create-docentVakId" formControlName="docentVakId" (change)="onDocentVakSelect()" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Kies uit gekoppelde docenten --</option>
                  @for (dv of beschikbareDocentVakken(); track dv.id) {
                    <option [value]="dv.id">{{ dv.vak }} &bull; {{ dv.docentNaam }}</option>
                  }
                  <option value="custom">[+] Andere docent / vak handmatig invoeren</option>
                </select>
              </div>

              @if (createMemoForm.value.docentVakId === 'custom') {
                <div class="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <label for="create-customVak" class="block text-xs font-semibold text-slate-600 mb-1">Vaknaam *</label>
                    <input id="create-customVak" type="text" formControlName="customVak" placeholder="Bijv. Wiskunde" class="w-full p-2 text-xs border border-slate-300 rounded outline-none">
                  </div>
                  <div>
                    <label for="create-customDocentNaam" class="block text-xs font-semibold text-slate-600 mb-1">Naam docent *</label>
                    <input id="create-customDocentNaam" type="text" formControlName="customDocentNaam" placeholder="Bijv. J. de Vries" class="w-full p-2 text-xs border border-slate-300 rounded outline-none">
                  </div>
                  <div class="col-span-2">
                    <label for="create-customDocentEmail" class="block text-xs font-semibold text-slate-600 mb-1">Docent e-mail</label>
                    <input id="create-customDocentEmail" type="email" formControlName="customDocentEmail" placeholder="docent@emmauscollege.nl" class="w-full p-2 text-xs border border-slate-300 rounded outline-none">
                  </div>
                </div>
              }

              <div>
                <label for="create-waarZieJeDitAan" class="block text-xs font-semibold text-slate-600 mb-1">Waar zie je dit aan? *</label>
                <textarea id="create-waarZieJeDitAan" formControlName="waarZieJeDitAan" rows="3" placeholder="Beschrijving van de bevindingen..." class="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>

              <div>
                <label for="create-watWerktWel" class="block text-xs font-semibold text-slate-600 mb-1">Wat werkt wel?</label>
                <textarea id="create-watWerktWel" formControlName="watWerktWel" rows="2" placeholder="Wat helpt deze leerling..." class="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
              </div>

              <div class="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button type="button" (click)="showCreateMemoModal.set(false)" class="px-4 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors">
                  Annuleren
                </button>
                <button type="submit" [disabled]="bezig()" class="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5">
                  <mat-icon class="text-[16px] w-[16px] h-[16px]">add</mat-icon> Memo Toevoegen
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class MentorPrepComponent {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private authService = inject(AuthService);

  /**
   * Een memo verwijderen mag vanaf mentor. Stond hier eerder zonder controle,
   * terwijl `firestore.rules` het weigerde voor een vakdocent: de knop was
   * zichtbaar, de klik leverde een foutmelding op.
   */
  magVerwijderen = computed(() => this.authService.mag('memoVerwijderen'));

  melding = signal<Melding | null>(null);
  bezig = signal(false);
  today = new Date();
  sidebarOpen = signal(true);
  viewingMemo = signal<DocentMemo | null>(null);
  editingMemo = signal<DocentMemo | null>(null);
  showCreateMemoModal = signal(false);

  form = this.fb.group({
    schooljaar: ['2026-2027'],
    periode: ['TW1', Validators.required],
    klas: ['', Validators.required],
    leerlingnummer: ['', Validators.required],
    overzichtResultaten: [''],
    belangrijksteSignalenUitMemos: [''],
    aandachtspuntenPersoonlijkeAchtergrond: [''],
    centraleBespreekvragen: [''],
    status: ['Concept', Validators.required]
  });

  editMemoForm = this.fb.group({
    aandachtInhoudelijkBegrip: [false],
    aandachtPlanningOrganisatie: [false],
    aandachtToetsvoorbereidingLeerstrategie: [false],
    aandachtInzetWerkhouding: [false],
    aandachtWerkNietOpOrde: [false],
    aandachtAanwezigheidVerzuim: [false],
    waarZieJeDitAan: ['', Validators.required],
    watWerktWel: [''],
    leerlingActie: [''],
    docentActie: [''],
    doorstroomToelichting: [''],
    emc: [null as 'Ja' | 'Nee' | null],
    status: ['Definitief', Validators.required]
  });

  createMemoForm = this.fb.group({
    docentVakId: ['', Validators.required],
    customVak: [''],
    customDocentNaam: [''],
    customDocentEmail: [''],
    waarZieJeDitAan: ['', Validators.required],
    watWerktWel: ['']
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

  selectedLeerling = computed(() => {
    return this.dataService.leerlingen().find(l => l.leerlingnummer === this.formValues().leerlingnummer);
  });

  beschikbareDocentVakken = computed(() => {
    const klas = this.formValues().klas;
    if (!klas) return [];
    return this.dataService.docentVakken().filter(dv => dv.klas === klas && dv.actief && dv.schooljaar === '2026-2027');
  });

  loadedMemos = computed(() => {
    const leerlingnummer = this.formValues().leerlingnummer;
    const periode = this.formValues().periode;
    if(!leerlingnummer) return [];

    if (periode === 'TW3') {
      return this.dataService.memoTW3().filter(m => m.leerlingnummer === leerlingnummer && m.schooljaar === '2026-2027');
    } else {
      return this.dataService.memoTW1TW2().filter(m => m.leerlingnummer === leerlingnummer && m.toetsweek === periode && m.schooljaar === '2026-2027');
    }
  });

  /** De al opgeslagen voorbereiding voor de gekozen leerling en periode, of null. */
  bestaandeVoorbereiding = computed(() => {
    const v = this.formValues();
    if (!v.leerlingnummer || !v.periode) return null;
    return this.dataService.mentorVoorbereiding().find(item =>
      item.leerlingnummer === v.leerlingnummer &&
      item.periode === v.periode &&
      item.schooljaar === (v.schooljaar || '2026-2027')
    ) ?? null;
  });

  /** Waarvoor het formulier het laatst is gevuld, zodat typen niet overschreven wordt. */
  private laatstGeladen: string | null = null;

  constructor() {
    // Laadt een eerder opgeslagen voorbereiding in zodra de mentor een leerling of
    // periode kiest. Leest bewust uit formValues() en niet uit form.value: dat laatste
    // is geen signal, waardoor dit effect nooit opnieuw zou draaien.
    effect(() => {
      const v = this.formValues();
      const existing = this.bestaandeVoorbereiding();
      if (!v.leerlingnummer || !v.periode) return;

      // Alleen (her)vullen als de selectie wijzigt of het record voor het eerst binnenkomt.
      // Zonder deze controle zou elke toetsaanslag het formulier terugzetten.
      const sleutel = `${v.leerlingnummer}|${v.periode}|${existing?.id ?? 'nieuw'}`;
      if (sleutel === this.laatstGeladen) return;
      this.laatstGeladen = sleutel;

      this.form.patchValue({
        overzichtResultaten: existing?.overzichtResultaten || '',
        belangrijksteSignalenUitMemos: existing?.belangrijksteSignalenUitMemos || '',
        aandachtspuntenPersoonlijkeAchtergrond: existing?.aandachtspuntenPersoonlijkeAchtergrond || '',
        centraleBespreekvragen: existing?.centraleBespreekvragen || '',
        status: existing?.status || 'Concept'
      }, { emitEvent: false });
    });

    this.form.get('leerlingnummer')?.valueChanges.subscribe(() => this.form.updateValueAndValidity());
    this.form.get('periode')?.valueChanges.subscribe(() => this.form.updateValueAndValidity());
  }

  onKlasChange() {
    this.form.patchValue({ leerlingnummer: '' });
  }

  isTW3(memo: DocentMemo | null | undefined): boolean {
    return (memo as { toetsweek?: string })?.toetsweek === 'TW3' || this.formValues().periode === 'TW3';
  }

  asTW12(memo: DocentMemo | null | undefined): MemoTW1TW2 | null {
    if (!memo) return null;
    return ((memo as { toetsweek?: string }).toetsweek !== 'TW3') ? (memo as MemoTW1TW2) : null;
  }

  asTW3(memo: DocentMemo | null | undefined): MemoTW3 | null {
    if (!memo) return null;
    return ((memo as { toetsweek?: string }).toetsweek === 'TW3') ? (memo as MemoTW3) : null;
  }

  openViewModal(memo: DocentMemo) {
    this.viewingMemo.set(memo);
  }

  openEditModal(memo: DocentMemo) {
    this.editingMemo.set(memo);
    const memoTW12 = memo as MemoTW1TW2;
    const memoTW3 = memo as MemoTW3;
    this.editMemoForm.patchValue({
      aandachtInhoudelijkBegrip: !!memo.aandachtInhoudelijkBegrip,
      aandachtPlanningOrganisatie: !!memo.aandachtPlanningOrganisatie,
      aandachtToetsvoorbereidingLeerstrategie: !!memo.aandachtToetsvoorbereidingLeerstrategie,
      aandachtInzetWerkhouding: !!memo.aandachtInzetWerkhouding,
      aandachtWerkNietOpOrde: !!memo.aandachtWerkNietOpOrde,
      aandachtAanwezigheidVerzuim: !!memo.aandachtAanwezigheidVerzuim,
      waarZieJeDitAan: memo.waarZieJeDitAan || '',
      watWerktWel: memo.watWerktWel || '',
      leerlingActie: memoTW12.leerlingActie || '',
      docentActie: memoTW12.docentActie || '',
      doorstroomToelichting: memoTW3.doorstroomToelichting || '',
      emc: memoTW12.emc ?? null,
      status: memo.status || 'Definitief'
    });
  }

  async saveEditedMemo() {
    const memo = this.editingMemo();
    if (!memo || !memo.id || this.editMemoForm.invalid) return;

    const val = this.editMemoForm.value;
    const currentUserEmail = this.authService.currentUser()?.email || 'mentor@school.nl';
    this.bezig.set(true);

    try {
      if (this.isTW3(memo)) {
        await this.dataService.updateMemoTW3(memo.id, {
          aandachtInhoudelijkBegrip: !!val.aandachtInhoudelijkBegrip,
          aandachtPlanningOrganisatie: !!val.aandachtPlanningOrganisatie,
          aandachtToetsvoorbereidingLeerstrategie: !!val.aandachtToetsvoorbereidingLeerstrategie,
          aandachtInzetWerkhouding: !!val.aandachtInzetWerkhouding,
          aandachtWerkNietOpOrde: !!val.aandachtWerkNietOpOrde,
          aandachtAanwezigheidVerzuim: !!val.aandachtAanwezigheidVerzuim,
          waarZieJeDitAan: val.waarZieJeDitAan || '',
          watWerktWel: val.watWerktWel || '',
          doorstroomToelichting: val.doorstroomToelichting || '',
          status: (val.status as 'Concept' | 'Definitief') || 'Definitief',
          gewijzigdOp: new Date().toISOString(),
          gewijzigdDoor: currentUserEmail
        });
      } else {
        await this.dataService.updateMemoTW1TW2(memo.id, {
          aandachtInhoudelijkBegrip: !!val.aandachtInhoudelijkBegrip,
          aandachtPlanningOrganisatie: !!val.aandachtPlanningOrganisatie,
          aandachtToetsvoorbereidingLeerstrategie: !!val.aandachtToetsvoorbereidingLeerstrategie,
          aandachtInzetWerkhouding: !!val.aandachtInzetWerkhouding,
          aandachtWerkNietOpOrde: !!val.aandachtWerkNietOpOrde,
          aandachtAanwezigheidVerzuim: !!val.aandachtAanwezigheidVerzuim,
          waarZieJeDitAan: val.waarZieJeDitAan || '',
          watWerktWel: val.watWerktWel || '',
          leerlingActie: val.leerlingActie || '',
          docentActie: val.docentActie || '',
          emc: (val.emc as 'Ja' | 'Nee') ?? null,
          status: (val.status as 'Concept' | 'Definitief') || 'Definitief',
          gewijzigdOp: new Date().toISOString(),
          gewijzigdDoor: currentUserEmail
        });
      }
      this.editingMemo.set(null);
    } catch (e) {
      this.melding.set(meldingBijFout(e));
    } finally {
      this.bezig.set(false);
    }
  }

  async deleteDocentMemo(memo: DocentMemo) {
    if (!memo || !memo.id) return;
    const bekrachtigd = confirm(`Weet je zeker dat je de memo voor ${memo.vak} (${memo.docentNaam}) wilt verwijderen?`);
    if (!bekrachtigd) return;

    this.bezig.set(true);
    try {
      if (this.isTW3(memo)) {
        await this.dataService.deleteMemoTW3(memo.id);
      } else {
        await this.dataService.deleteMemoTW1TW2(memo.id);
      }
      if (this.viewingMemo()?.id === memo.id) this.viewingMemo.set(null);
      if (this.editingMemo()?.id === memo.id) this.editingMemo.set(null);
    } catch (e) {
      this.melding.set(meldingBijFout(e));
    } finally {
      this.bezig.set(false);
    }
  }

  openCreateMemoModal() {
    this.createMemoForm.reset({
      docentVakId: '',
      customVak: '',
      customDocentNaam: '',
      customDocentEmail: '',
      waarZieJeDitAan: '',
      watWerktWel: ''
    });
    this.showCreateMemoModal.set(true);
  }

  onDocentVakSelect() {
    // Helper if needed
  }

  async saveNewDocentMemo() {
    if (this.createMemoForm.invalid) {
      this.createMemoForm.markAllAsTouched();
      return;
    }

    const val = this.createMemoForm.value;
    const l = this.selectedLeerling();
    if (!l) return;

    let docentNaam = '';
    let docentEmail = '';
    let vak = '';

    if (val.docentVakId === 'custom') {
      vak = (val.customVak || '').trim();
      docentNaam = (val.customDocentNaam || '').trim();
      docentEmail = (val.customDocentEmail || '').trim() || 'docent@emmauscollege.nl';
      if (!vak || !docentNaam) return;
    } else {
      const dv = this.beschikbareDocentVakken().find(d => d.id === val.docentVakId);
      if (!dv) return;
      vak = dv.vak;
      docentNaam = dv.docentNaam;
      docentEmail = dv.docentEmail;
    }

    const periode = this.form.value.periode as 'TW1' | 'TW2' | 'TW3';
    const currentUserEmail = this.authService.currentUser()?.email || 'mentor@school.nl';
    this.bezig.set(true);

    try {
      if (periode === 'TW3') {
        await this.dataService.addMemoTW3({
          schooljaar: this.form.value.schooljaar || '2026-2027',
          toetsweek: 'TW3',
          leerlingnummer: l.leerlingnummer,
          leerling: l.leerling,
          klas: l.klas,
          docentNaam,
          docentEmail,
          vak,
          aandachtInhoudelijkBegrip: false,
          aandachtPlanningOrganisatie: false,
          aandachtToetsvoorbereidingLeerstrategie: false,
          aandachtInzetWerkhouding: false,
          aandachtWerkNietOpOrde: false,
          aandachtAanwezigheidVerzuim: false,
          waarZieJeDitAan: val.waarZieJeDitAan || '',
          watWerktWel: val.watWerktWel || '',
          doorstroomToelichting: '',
          status: 'Definitief',
          aangemaaktDoor: currentUserEmail,
          aangemaaktOp: new Date().toISOString(),
          gewijzigdOp: new Date().toISOString(),
          gewijzigdDoor: currentUserEmail
        });
      } else {
        await this.dataService.addMemoTW1TW2({
          schooljaar: this.form.value.schooljaar || '2026-2027',
          toetsweek: periode as 'TW1' | 'TW2',
          leerlingnummer: l.leerlingnummer,
          leerling: l.leerling,
          klas: l.klas,
          docentNaam,
          docentEmail,
          vak,
          aandachtInhoudelijkBegrip: false,
          aandachtPlanningOrganisatie: false,
          aandachtToetsvoorbereidingLeerstrategie: false,
          aandachtInzetWerkhouding: false,
          aandachtWerkNietOpOrde: false,
          aandachtAanwezigheidVerzuim: false,
          waarZieJeDitAan: val.waarZieJeDitAan || '',
          watWerktWel: val.watWerktWel || '',
          leerlingActie: '',
          docentActie: '',
          emc: null,
          status: 'Definitief',
          aangemaaktDoor: currentUserEmail,
          aangemaaktOp: new Date().toISOString(),
          gewijzigdOp: new Date().toISOString(),
          gewijzigdDoor: currentUserEmail
        });
      }
      this.showCreateMemoModal.set(false);
    } catch (e) {
      this.melding.set(meldingBijFout(e));
    } finally {
      this.bezig.set(false);
    }
  }

  overnemenSignalenUitMemos() {
    const memos = this.loadedMemos();
    if (memos.length === 0) return;

    const samenvatting = memos.map(m => {
      const punten = [];
      if (m.aandachtInhoudelijkBegrip) punten.push('begrip');
      if (m.aandachtPlanningOrganisatie) punten.push('planning');
      if (m.aandachtToetsvoorbereidingLeerstrategie) punten.push('toetsvoorbereiding');
      if (m.aandachtInzetWerkhouding) punten.push('werkhouding');
      if (m.aandachtWerkNietOpOrde) punten.push('werk niet op orde');
      if (m.aandachtAanwezigheidVerzuim) punten.push('verzuim');

      const puntenStr = punten.length > 0 ? ` (${punten.join(', ')})` : '';
      return `• ${m.vak} (${m.docentNaam})${puntenStr}: ${m.waarZieJeDitAan}`;
    }).join('\n\n');

    const bestaand = this.form.value.belangrijksteSignalenUitMemos?.trim();
    const nieuw = bestaand ? `${bestaand}\n\n${samenvatting}` : samenvatting;
    this.form.patchValue({ belangrijksteSignalenUitMemos: nieuw });
  }

  printPage() {
    window.print();
  }

  async submitDraft() {
    this.form.patchValue({ status: 'Concept' });
    await this.onSubmit();
  }

  async submitFinal() {
    this.form.patchValue({ status: 'Definitief' });
    await this.onSubmit();
  }

  private async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const leerling = this.filteredLeerlingen().find(l => l.leerlingnummer === val.leerlingnummer);
    if (!leerling) return;

    // Wachten op de opslag voordat we succes melden; de melding verscheen eerder
    // ook als de schrijfactie mislukte.
    this.bezig.set(true);
    this.melding.set(null);
    try {
      const uitkomst = await wachtOpOpslag(this.dataService.saveMentorVoorbereiding({
      schooljaar: val.schooljaar!,
      periode: (val.periode as 'TW1' | 'TW2' | 'TW3') || 'TW1',
      leerlingnummer: leerling.leerlingnummer,
      leerling: leerling.leerling,
      klas: leerling.klas,
      mentorNaam: leerling.mentorNaam,
      mentorEmail: leerling.mentorEmail,
      overzichtResultaten: val.overzichtResultaten || '',
      belangrijksteSignalenUitMemos: val.belangrijksteSignalenUitMemos || '',
      aandachtspuntenPersoonlijkeAchtergrond: val.aandachtspuntenPersoonlijkeAchtergrond || '',
      centraleBespreekvragen: val.centraleBespreekvragen || '',
      status: (val.status as 'Concept' | 'Definitief') || 'Concept',
      aangemaaktDoor: this.authService.currentUser()?.email || 'mentor@school.nl',
      aangemaaktOp: new Date().toISOString(),
      gewijzigdOp: new Date().toISOString(),
      gewijzigdDoor: this.authService.currentUser()?.email || ''
      }));

      if (uitkomst === 'bevestigd') {
        this.melding.set(MELDING_BEVESTIGD('Voorbereiding'));
        setTimeout(() => { if (this.melding()?.soort === 'ok') this.melding.set(null); }, 4000);
      } else {
        this.melding.set(MELDING_WACHT);
      }
    } catch (e) {
      // De invoer blijft staan, zodat niemand zijn tekst kwijt is.
      this.melding.set(meldingBijFout(e));
    } finally {
      this.bezig.set(false);
    }
  }
}
