import { Component, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AccessCode, Docent, UserRole } from '../models/data.models';
import { MatIconModule } from '@angular/material/icon';
import { parseCsv, downloadCsv } from '../utils/csv';
import { collection, setDoc, onSnapshot, query, orderBy, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Melding } from '../utils/opslag';
import {
  NIEUWE_CODE_ACTIEF,
  actieveCodesMetRol,
  analyseerAccessCodeMigratie,
  bezwaarTegenIntrekken,
  codeVereistDocentIdentiteit,
  isActieveCode,
  magActiveren,
  moetUitloggenNaIntrekken,
  uitlegBijBezwaar,
  veldenVoorActiveren,
  veldenVoorIntrekken,
} from '../utils/toegangscode';
import {
  afkortingIsGeldig,
  normaliseerAfkorting,
  toonAfkorting,
  zelfdeAfkorting,
} from '../utils/docent-afkorting';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { controleerPR8Readiness, PR8ReadinessRapport } from '../utils/pr8-readiness';

@Component({
  selector: 'app-superuser',
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

          <!-- Algemene PR8-Readiness Status (7 Gegevensdomeinen) -->
          <div class="bg-white border rounded-2xl p-6 shadow-sm space-y-5"
               [class.border-emerald-300]="pr8Rapport().gereed"
               [class.border-amber-300]="!pr8Rapport().gereed">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="p-2.5 rounded-xl shrink-0"
                     [class.bg-emerald-100]="pr8Rapport().gereed" [class.text-emerald-700]="pr8Rapport().gereed"
                     [class.bg-amber-100]="!pr8Rapport().gereed" [class.text-amber-800]="!pr8Rapport().gereed">
                  <mat-icon class="text-2xl">{{ pr8Rapport().gereed ? 'verified' : 'fact_check' }}</mat-icon>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-bold text-slate-900">PR8-Readiness & Migratiestatus</h3>
                    <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide"
                          [class.bg-emerald-100]="pr8Rapport().gereed" [class.text-emerald-800]="pr8Rapport().gereed"
                          [class.bg-amber-100]="!pr8Rapport().gereed" [class.text-amber-800]="!pr8Rapport().gereed">
                      {{ pr8Rapport().gereed ? 'Gereed voor PR9' : pr8Rapport().totaalProblemen + ' blokkade(s)' }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-600 mt-1 max-w-2xl">
                    @if (pr8Rapport().gereed) {
                      Alle 7 domeinen zijn 100% gekoppeld aan canonieke docenten. De data is klaar voor de definitieve PR9-cutover.
                    } @else {
                      Er zijn {{ pr8Rapport().totaalProblemen }} records zonder geldige canonieke docentafkorting. Los deze op via de onderstaande herstelroutes vóór de PR9-cutover.
                    }
                  </p>
                </div>
              </div>

              @if (pr8Rapport().totaalProblemen > 0) {
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    (click)="toonAllePR8Blokkades.set(!toonAllePR8Blokkades())"
                    class="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer">
                    <mat-icon class="text-[15px] w-[15px] h-[15px]">{{ toonAllePR8Blokkades() ? 'visibility_off' : 'list' }}</mat-icon>
                    {{ toonAllePR8Blokkades() ? 'Verberg blokkades' : 'Toon details (' + pr8Rapport().totaalProblemen + ')' }}
                  </button>
                </div>
              }
            </div>

            <!-- Overzicht van de 7 domeinen -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              @for (onderdeel of pr8OnderdelenLijst(); track onderdeel.onderdeel) {
                <div class="p-3.5 rounded-xl border flex flex-col justify-between transition-all"
                     [class.bg-emerald-50/40]="onderdeel.problemen === 0"
                     [class.border-emerald-200]="onderdeel.problemen === 0"
                     [class.bg-amber-50/40]="onderdeel.problemen > 0"
                     [class.border-amber-300]="onderdeel.problemen > 0">
                  <div>
                    <div class="flex items-center justify-between mb-1.5">
                      <span class="text-xs font-bold text-slate-800">{{ onderdeel.titel }}</span>
                      <mat-icon class="text-[16px] w-[16px] h-[16px]"
                                [class.text-emerald-600]="onderdeel.problemen === 0"
                                [class.text-amber-600]="onderdeel.problemen > 0">
                        {{ onderdeel.problemen === 0 ? 'check_circle' : 'warning' }}
                      </mat-icon>
                    </div>
                    <div class="text-[11px] text-slate-500">
                      {{ onderdeel.inOrde }} van {{ onderdeel.totaal }} in orde
                    </div>
                  </div>

                  <div class="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                    @if (onderdeel.problemen === 0) {
                      <span class="text-[11px] font-semibold text-emerald-700">100% gereed</span>
                    } @else {
                      <span class="text-[11px] font-bold text-amber-800">{{ onderdeel.problemen }} open</span>
                    }

                    @if (onderdeel.onderdeel === 'toegangscodes') {
                      <button
                        (click)="alleenHerstelNodig.set(true)"
                        class="text-[11px] font-bold text-[#e87700] hover:underline flex items-center gap-0.5 cursor-pointer">
                        Filter
                        <mat-icon class="text-[12px] w-[12px] h-[12px]">arrow_forward</mat-icon>
                      </button>
                    } @else {
                      <button
                        type="button"
                        (click)="gaNaar(onderdeel.herstelRoute)"
                        class="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer">
                        Herstel
                        <mat-icon class="text-[12px] w-[12px] h-[12px]">arrow_forward</mat-icon>
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Details van alle blokkades (indien uitgeklapt) -->
            @if (toonAllePR8Blokkades() && pr8Rapport().alleProblemen.length > 0) {
              <div class="mt-4 pt-4 border-t border-slate-200 max-h-72 overflow-y-auto space-y-2">
                <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Overzicht openstaande blokkades</h4>
                @for (probleem of pr8Rapport().alleProblemen; track probleem.id) {
                  <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div class="min-w-0">
                      <span class="font-bold text-slate-800">{{ probleem.titel }}</span>
                      <p class="text-slate-600 text-[11px]">{{ probleem.detail }}</p>
                    </div>
                    @if (probleem.onderdeel === 'toegangscodes') {
                      <button
                        (click)="alleenHerstelNodig.set(true)"
                        class="px-2.5 py-1 text-xs font-semibold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded shrink-0 transition-colors cursor-pointer">
                        Toon code
                      </button>
                    } @else {
                      <button
                        type="button"
                        (click)="gaNaar(probleem.herstelRoute)"
                        class="px-2.5 py-1 text-xs font-semibold bg-blue-100 hover:bg-blue-200 text-blue-900 rounded shrink-0 transition-colors cursor-pointer">
                        Naar herstel
                      </button>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- PR8-Readiness Migratiestatus Toegangscodes -->
          @if (migratieStatus().probleemGevallen.length > 0) {
            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-sm">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-start gap-3">
                  <mat-icon class="text-amber-600 shrink-0 mt-0.5">warning</mat-icon>
                  <div>
                    <h4 class="font-bold text-amber-900 text-sm">
                      {{ migratieStatus().probleemGevallen.length }}
                      {{ migratieStatus().probleemGevallen.length === 1 ? 'toegangscode vereist' : 'toegangscodes vereisen' }}
                      een canonieke docentkoppeling (PR8-readiness)
                    </h4>
                    <p class="text-xs text-amber-800 mt-1 max-w-2xl">
                      {{ migratieStatus().zonderAfkorting }} actieve docent-/mentorcode(s) missen een docentafkorting en
                      {{ migratieStatus().onbekendeAfkorting }} hebben een onbekende afkorting.
                      Koppel elke code expliciet aan een canonieke docent uit de personeelslijst; er wordt nooit automatisch gekoppeld op naam of e-mail.
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <button
                    (click)="alleenHerstelNodig.set(!alleenHerstelNodig())"
                    class="px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                    [class.bg-amber-600]="alleenHerstelNodig()"
                    [class.text-white]="alleenHerstelNodig()"
                    [class.border-amber-600]="alleenHerstelNodig()"
                    [class.bg-white]="!alleenHerstelNodig()"
                    [class.text-amber-900]="!alleenHerstelNodig()"
                    [class.border-amber-300]="!alleenHerstelNodig()">
                    <mat-icon class="text-[15px] w-[15px] h-[15px]">{{ alleenHerstelNodig() ? 'filter_alt' : 'filter_alt_off' }}</mat-icon>
                    {{ alleenHerstelNodig() ? 'Toon alle codes' : 'Toon alleen te herstellen codes' }}
                  </button>
                </div>
              </div>
            </div>
          } @else if (migratieStatus().totaal > 0) {
            <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <mat-icon class="text-emerald-600">check_circle</mat-icon>
              <div class="text-xs text-emerald-800">
                <span class="font-bold">Alle {{ migratieStatus().totaal }} relevante toegangscodes</span> zijn gekoppeld aan een bekende canonieke docentafkorting. Gereed voor PR8!
              </div>
            </div>
          }
          
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
                    <th class="px-6 py-4">Status</th>
                    <th class="px-6 py-4 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (code of filteredCodes(); track code.id) {
                    <tr class="hover:bg-slate-50 transition-colors" [class.bg-purple-50/40]="code.role === 'Superuser'" [class.opacity-60]="!isActief(code)">
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
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-slate-800">{{ code.ownerName }}</span>
                          @if (code.docentAfkorting) {
                            @if (isAfkortingBekend(code.docentAfkorting)) {
                              <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200" title="Docentafkorting">
                                {{ toon(code.docentAfkorting) }}
                              </span>
                            } @else {
                              <span class="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 flex items-center gap-1" title="Onbekende docentafkorting: niet gevonden in docentenbestand">
                                <mat-icon class="text-[12px] w-[12px] h-[12px]">error</mat-icon>
                                {{ toon(code.docentAfkorting) }} (?)
                              </span>
                            }
                          } @else if (vereistAfkorting(code)) {
                            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5" title="Code van vóór PR 6 zonder gekoppelde canonieke docent">
                              <mat-icon class="text-[11px] w-[11px] h-[11px]">warning</mat-icon>
                              Afkorting ontbreekt
                            </span>
                          } @else {
                            <span class="text-[10px] text-slate-400 italic" title="Geen docentafkorting vereist voor deze rol">
                              N.v.t.
                            </span>
                          }
                        </div>
                        <div class="text-xs text-slate-500">{{ code.ownerEmail }}</div>
                      </td>
                      <td class="px-6 py-4">
                        <span [class]="getRoleClass(code.role)" class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                          {{ code.role }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-slate-600 italic">{{ code.vak || '-' }}</td>
                      <td class="px-6 py-4 text-slate-400 text-xs">{{ code.createdAt | date:'dd-MM HH:mm' }}</td>
                      <td class="px-6 py-4">
                        @if (isActief(code)) {
                          <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">Actief</span>
                        } @else {
                          <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-200" title="Ingetrokken op {{ code.gewijzigdOp | date:'dd-MM-yyyy HH:mm' }}">Ingetrokken</span>
                        }
                      </td>
                      <td class="px-6 py-4 text-right">
                        <div class="flex items-center justify-end gap-1">
                          @if (vereistAfkorting(code) && (!code.docentAfkorting || !isAfkortingBekend(code.docentAfkorting))) {
                            <button (click)="openRepairModal(code)"
                                    class="px-2 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Koppel expliciet aan een canonieke docent">
                              <mat-icon class="text-[14px] w-[14px] h-[14px]">link</mat-icon>
                              Koppelen
                            </button>
                          }
                          @if (kanActiveren(code)) {
                            <button (click)="zetCodeActief(code, true)" [disabled]="bezigMetCode() === code.id"
                                    class="px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                    title="Code weer laten werken">
                              <mat-icon class="text-[15px] w-[15px] h-[15px]">lock_open</mat-icon>
                              Activeren
                            </button>
                          } @else if (bezwaarIntrekken(code); as bezwaar) {
                            <span class="text-[11px] text-slate-400 italic max-w-[220px] text-right" [title]="bezwaar">Laatste beheerderscode</span>
                          } @else {
                            <button (click)="zetCodeActief(code, false)" [disabled]="bezigMetCode() === code.id"
                                    class="px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 border border-amber-200 rounded transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                                    title="Code dichtzetten; wie ermee is ingelogd verliest zijn toegang">
                              <mat-icon class="text-[15px] w-[15px] h-[15px]">block</mat-icon>
                              Intrekken
                            </button>
                          }
                          @if (code.role !== 'Superuser') {
                            <button (click)="promptDeleteCode(code)" class="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer" title="Code verwijderen (onomkeerbaar, laat geen spoor na)">
                              <mat-icon class="text-[18px] w-[18px] h-[18px]">delete</mat-icon>
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="px-6 py-20 text-center text-slate-400 italic">Geen codes gevonden.</td>
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
                  <label for="docent-select" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Docent (Personeelslid)</label>
                  <select id="docent-select" [value]="newCodeAfkorting()" (change)="onDocentChange($event)" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20">
                    <option value="">-- Kies een docent --</option>
                    @for (docent of actieveDocenten(); track docent.afkorting) {
                      <option [value]="docent.afkorting">{{ toonDocentOptie(docent) }}</option>
                    }
                  </select>
                  @if (actieveDocenten().length === 0) {
                    <p class="text-xs text-amber-600 mt-1">Geen actieve docenten gevonden. Voeg eerst docenten toe via Docentenbeheer.</p>
                  }
                </div>

                @if (newCodeName()) {
                  <div>
                    <span class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gekoppelde Naam</span>
                    <div class="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-medium text-sm">
                      {{ newCodeName() }}
                    </div>
                  </div>
                }

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
                    <th class="px-4 py-3 border-b border-slate-200">Afkorting</th>
                    <th class="px-4 py-3 border-b border-slate-200">Docent</th>
                    <th class="px-4 py-3 border-b border-slate-200">Email</th>
                    <th class="px-4 py-3 border-b border-slate-200">Rol</th>
                    <th class="px-4 py-3 border-b border-slate-200">Vak</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (row of csvPreviewData(); track (row.docentAfkorting + row.ownerEmail)) {
                    <tr class="hover:bg-slate-50">
                      <td class="px-4 py-3 font-mono font-bold text-slate-800">{{ toon(row.docentAfkorting) }}</td>
                      <td class="px-4 py-3 font-medium text-slate-900">{{ row.ownerName }}</td>
                      <td class="px-4 py-3 text-slate-600">{{ row.ownerEmail }}</td>
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

      <!-- Repair Modal voor Docent/Mentor Toegangscode Koppeling -->
      @if (repairCode(); as c) {
        <div class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <div class="flex items-start gap-4 mb-4">
              <div class="p-3 bg-amber-100 text-amber-700 rounded-full shrink-0">
                <mat-icon class="text-2xl">link</mat-icon>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-lg font-bold text-slate-900">Toegangscode koppelen aan docent</h3>
                <p class="text-xs text-slate-600 mt-1">
                  Koppel toegangscode <span class="font-mono font-bold text-slate-900">{{ c.code }}</span> ({{ c.role }}) expliciet aan een canonieke docent uit de personeelsadministratie.
                </p>
              </div>
            </div>

            <div class="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-slate-500">Huidige weergavenaam:</span>
                <span class="font-medium text-slate-800">{{ c.ownerName }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">E-mailadres:</span>
                <span class="font-medium text-slate-800">{{ c.ownerEmail }}</span>
              </div>
              @if (c.docentAfkorting) {
                <div class="flex justify-between">
                  <span class="text-slate-500">Huidige afkorting:</span>
                  <span class="font-mono font-bold text-red-600">{{ c.docentAfkorting }} (onbekend in docentenlijst)</span>
                </div>
              } @else {
                <div class="flex justify-between">
                  <span class="text-slate-500">Huidige status:</span>
                  <span class="font-medium text-amber-700">Geen afkorting gekoppeld (legacy code)</span>
                </div>
              }
            </div>

            <div class="space-y-3">
              <div>
                <label for="repair-docent-select" class="block text-xs font-bold text-slate-700 mb-1">
                  Kies canonieke docent *
                </label>
                <select
                  id="repair-docent-select"
                  [value]="repairDocentAfkorting()"
                  (change)="onRepairDocentChange($event)"
                  class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm">
                  <option value="">-- Selecteer een actieve docent --</option>
                  @for (d of actieveDocenten(); track d.afkorting) {
                    <option [value]="d.afkorting">{{ toon(d.afkorting) }} - {{ d.naam }}</option>
                  }
                </select>
                <p class="text-[11px] text-slate-500 mt-1.5">
                  Let op: kies bewust de juiste docent. Er wordt nooit automatisch gekoppeld op basis van naam of e-mailadres.
                </p>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                (click)="closeRepairModal()"
                [disabled]="repairBezig()"
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer">
                Annuleren
              </button>
              <button
                (click)="saveRepairedCode()"
                [disabled]="!repairDocentAfkorting() || repairBezig()"
                class="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                @if (repairBezig()) {
                  <mat-icon class="animate-spin text-[16px]">refresh</mat-icon>
                } @else {
                  <mat-icon class="text-[16px]">check</mat-icon>
                }
                Opslaan & Koppelen
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class SuperuserComponent implements OnDestroy {
  auth = inject(AuthService);
  dataService = inject(DataService);
  private router = inject(Router, { optional: true });

  gaNaar(route: string) {
    if (this.router) {
      this.router.navigateByUrl(route);
    }
  }

  codes = signal<AccessCode[]>([]);
  searchQuery = signal('');
  selectedRoleFilter = signal<string>('ALLE');
  showCreate = signal(false);
  csvPreviewData = signal<any[] | null>(null);
  melding = signal<Melding | null>(null);

  docenten = this.dataService.docenten;
  actieveDocenten = computed(() =>
    this.docenten()
      .filter(d => d.actief)
      .sort((a, b) => a.afkorting.localeCompare(b.afkorting))
  );

  superuserCodes = computed(() => this.codes().filter(c => c.role === 'Superuser'));

  /** Migratiestatus van alle actieve Docent/Mentor codes voor PR8-readiness */
  migratieStatus = computed(() =>
    analyseerAccessCodeMigratie(this.codes(), this.docenten())
  );

  /** Gezamenlijke PR8-Readiness over alle 7 domeinen */
  pr8Rapport = computed<PR8ReadinessRapport>(() =>
    controleerPR8Readiness({
      docenten: this.docenten(),
      docentVakken: this.dataService.docentVakken(),
      docentTaken: this.dataService.docentTaken(),
      memoTW1TW2: this.dataService.memoTW1TW2(),
      memoTW3: this.dataService.memoTW3(),
      toegangscodes: this.codes(),
      leerlingen: this.dataService.leerlingen(),
    })
  );

  pr8OnderdelenLijst = computed(() => Object.values(this.pr8Rapport().onderdelen));

  toonAllePR8Blokkades = signal(false);

  alleenHerstelNodig = signal(false);

  repairCode = signal<AccessCode | null>(null);
  repairDocentAfkorting = signal<string>('');
  repairBezig = signal<boolean>(false);

  vereistAfkorting(code: AccessCode): boolean {
    return codeVereistDocentIdentiteit(code);
  }

  isAfkortingBekend(afkorting?: string | null): boolean {
    if (!afkorting) return false;
    const norm = normaliseerAfkorting(afkorting);
    return this.docenten().some(d => normaliseerAfkorting(d.afkorting) === norm);
  }

  openRepairModal(code: AccessCode) {
    this.repairCode.set(code);
    const bestaand = code.docentAfkorting && afkortingIsGeldig(code.docentAfkorting)
      ? normaliseerAfkorting(code.docentAfkorting)
      : '';
    this.repairDocentAfkorting.set(bestaand);
  }

  closeRepairModal() {
    this.repairCode.set(null);
    this.repairDocentAfkorting.set('');
  }

  onRepairDocentChange(event: Event) {
    this.repairDocentAfkorting.set((event.target as HTMLSelectElement).value);
  }

  async saveRepairedCode() {
    const code = this.repairCode();
    if (!code || !code.id) return;

    const rawAfk = this.repairDocentAfkorting().trim();
    if (!rawAfk || !afkortingIsGeldig(rawAfk)) {
      this.melding.set({ soort: 'fout', tekst: 'Kies een geldige docentafkorting.' });
      return;
    }

    const norm = normaliseerAfkorting(rawAfk);
    const docent = this.docenten().find(d => zelfdeAfkorting(d.afkorting, norm));
    if (!docent) {
      this.melding.set({ soort: 'fout', tekst: `Docent met afkorting "${norm}" niet gevonden in het docentenbestand.` });
      return;
    }

    if (!docent.actief) {
      this.melding.set({ soort: 'fout', tekst: `Docent "${docent.naam}" (${toonAfkorting(norm)}) is inactief.` });
      return;
    }

    this.repairBezig.set(true);
    try {
      await setDoc(doc(db, 'codes', code.id), {
        docentAfkorting: norm,
        ownerName: docent.naam,
      }, { merge: true });

      // Lokale signal bijwerken zodat de tabel en banners meteen reageren
      this.codes.update(huidig =>
        huidig.map(c => c.id === code.id ? { ...c, docentAfkorting: norm, ownerName: docent.naam } : c)
      );

      this.melding.set({
        soort: 'ok',
        tekst: `Toegangscode ${code.code} (${code.role}) succesvol gekoppeld aan docent ${docent.naam} (${toonAfkorting(norm)}).`,
      });
      this.closeRepairModal();
    } catch (e: any) {
      console.error('Herstellen toegangscode mislukt:', e);
      this.melding.set({ soort: 'fout', tekst: 'Fout bij herstellen van toegangscode: ' + (e.message || String(e)) });
    } finally {
      this.repairBezig.set(false);
    }
  }

  /** Actieve beheerderscodes. Een ingetrokken code telt niet als vangnet. */
  actieveBeheerders = computed(() => actieveCodesMetRol(this.codes(), 'Superuser'));

  /** Bezig met intrekken of activeren; blokkeert dubbelklikken. */
  bezigMetCode = signal<string | null>(null);

  isActief(code: AccessCode): boolean {
    return isActieveCode(code);
  }

  kanActiveren(code: AccessCode): boolean {
    return magActiveren(code);
  }

  /** Uitleg waarom intrekken niet kan, of null als het gewoon mag. */
  bezwaarIntrekken(code: AccessCode): string | null {
    const bezwaar = bezwaarTegenIntrekken(code, this.codes());
    return bezwaar === null || bezwaar === 'al-ingetrokken' ? null : uitlegBijBezwaar(bezwaar);
  }

  /**
   * Trekt een code in of zet hem weer aan.
   *
   * Intrekken is met opzet omkeerbaar: een code die per ongeluk bij de
   * verkeerde persoon terechtkwam moet je direct kunnen dichtzetten, en een
   * vergissing moet je terug kunnen draaien zonder een nieuwe code uit te
   * delen. Verwijderen blijft bestaan, maar wist ook het spoor.
   */
  async zetCodeActief(code: AccessCode, actief: boolean) {
    if (!code.id) return;

    if (!actief) {
      const bezwaar = bezwaarTegenIntrekken(code, this.codes());
      if (bezwaar) {
        this.melding.set({ soort: 'fout', tekst: uitlegBijBezwaar(bezwaar) });
        return;
      }
    }

    this.bezigMetCode.set(code.id);
    try {
      // Bij activeren gaat `used` mee terug naar false. Alleen `active: true`
      // is niet genoeg: een legacydocument met `used: true` bleef anders
      // geweigerd worden terwijl het scherm meldde dat de code weer werkte.
      await setDoc(
        doc(db, 'codes', code.id),
        actief ? veldenVoorActiveren() : veldenVoorIntrekken(),
        { merge: true },
      );
      this.melding.set({
        soort: 'ok',
        tekst: actief
          ? `Toegangscode van ${code.ownerName} is weer actief.`
          : `Toegangscode van ${code.ownerName} is ingetrokken. Wie er nu mee is ingelogd, verliest bij de eerstvolgende actie zijn toegang.`,
      });

      // Trok de beheerder zijn eigen code in, dan is zijn sessie zojuist
      // ongeldig geworden. Dat mag -- er blijft immers een andere actieve
      // beheerderscode over -- maar de app moet hem dan wel netjes uitloggen in
      // plaats van te doen alsof hij nog ingelogd is.
      if (!actief && moetUitloggenNaIntrekken(code.id, this.auth.currentUser()?.code)) {
        await this.auth.logout();
        return;
      }
    } catch (e) {
      console.error('Code intrekken/activeren mislukt', e);
      const reden = e instanceof Error ? e.message : String(e);
      this.melding.set({ soort: 'fout', tekst: 'Wijzigen van de code is niet gelukt: ' + reden });
    } finally {
      this.bezigMetCode.set(null);
    }
  }

  // Delete modal state
  codeToDelete = signal<AccessCode | null>(null);
  isDeleting = signal(false);

  // Cleanup state
  showCleanupConfirm = signal(false);
  isCleaning = signal(false);

  newCodeRole = signal<UserRole>('Docent');
  newCodeAfkorting = signal('');
  newCodeName = signal('');
  newCodeEmail = signal('');
  newCodeVak = signal('');

  geselecteerdeDocent = computed(() =>
    this.docenten().find(d => zelfdeAfkorting(d.afkorting, this.newCodeAfkorting()))
  );

  toon(afkorting: string): string {
    return toonAfkorting(afkorting);
  }

  toonDocentOptie(docent: Docent): string {
    return `${toonAfkorting(docent.afkorting)} - ${docent.naam}`;
  }

  onDocentChange(event: Event) {
    const afk = (event.target as HTMLSelectElement).value;
    this.newCodeAfkorting.set(afk);
    const docent = this.actieveDocenten().find(d => zelfdeAfkorting(d.afkorting, afk));
    this.newCodeName.set(docent ? docent.naam : '');
  }

  downloadTemplate() {
    downloadCsv('Template_AccessCodes.csv', [
      ['Afkorting', 'Email', 'Rol', 'Vak'],
      ['vis', 'visser@school.nl', 'Docent', 'Wiskunde'],
      ['pie', 'pietersen@school.nl', 'Mentor', ''],
      ['jan', 'jansen@school.nl', 'Coordinator', '']
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

      const headers = rows[0].map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
      const afkIdx = headers.indexOf('afkorting');
      const emailIdx = headers.indexOf('email');
      const rolIdx = headers.indexOf('rol');
      const vakIdx = headers.indexOf('vak');

      if (afkIdx === -1 || emailIdx === -1 || rolIdx === -1) {
        this.melding.set({
          soort: 'fout',
          tekst: 'Kolomnamen komen niet overeen met het sjabloon (verwacht minimaal: Afkorting, Email, Rol, Vak).'
        });
        event.target.value = '';
        return;
      }

      const rowsToImport = [];
      const fouten: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i];
        const rawAfkorting = columns[afkIdx]?.trim() || '';
        const email = columns[emailIdx]?.trim() || '';
        const rol = columns[rolIdx]?.trim() as UserRole;
        const vak = vakIdx !== -1 ? (columns[vakIdx]?.trim() || '') : '';

        if (!rawAfkorting || !email || !['Docent', 'Mentor', 'Coordinator', 'Superuser'].includes(rol)) {
          fouten.push(`Rij ${i + 1}: ontbrekende gegevens of ongeldige rol.`);
          continue;
        }

        if (!afkortingIsGeldig(rawAfkorting)) {
          fouten.push(`Rij ${i + 1}: ongeldige afkorting "${rawAfkorting}".`);
          continue;
        }

        const norm = normaliseerAfkorting(rawAfkorting);
        const docent = this.docenten().find(d => zelfdeAfkorting(d.afkorting, norm));

        if (!docent) {
          fouten.push(`Rij ${i + 1}: docent met afkorting "${rawAfkorting}" niet gevonden in Docentenbeheer.`);
          continue;
        }

        if (!docent.actief) {
          fouten.push(`Rij ${i + 1}: docent "${docent.naam}" (${toonAfkorting(norm)}) is inactief.`);
          continue;
        }

        rowsToImport.push({
          docentAfkorting: norm,
          ownerName: docent.naam,
          ownerEmail: email,
          role: rol,
          vak: rol === 'Docent' ? vak : '',
        });
      }

      if (rowsToImport.length > 0) {
        this.csvPreviewData.set(rowsToImport);
        if (fouten.length > 0) {
          this.melding.set({
            soort: 'fout',
            tekst: `${fouten.length} rijen overgeslagen wegens fouten. Eerste fout: ${fouten[0]}`
          });
        }
      } else {
        this.melding.set({
          soort: 'fout',
          tekst: fouten.length > 0 ? fouten[0] : 'Geen geldige rijen gevonden in het CSV-bestand.'
        });
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
      const newCode: AccessCode = {
        id: code,
        code,
        role: row.role,
        ownerName: row.ownerName,
        ownerEmail: row.ownerEmail,
        docentAfkorting: row.docentAfkorting,
        createdAt: new Date().toISOString(),
        active: NIEUWE_CODE_ACTIEF,
        used: false
      };

      if (row.role === 'Docent' && row.vak) {
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
    const alleenHerstel = this.alleenHerstelNodig();
    const probleemCodeIds = new Set(this.migratieStatus().probleemGevallen.map(p => p.codeId));

    return this.codes()
      .filter(c => {
        if (alleenHerstel && (!c.id || !probleemCodeIds.has(c.id))) return false;
        if (roleFilter !== 'ALLE' && c.role !== roleFilter) return false;
        return (
          !q ||
          (c.ownerName && c.ownerName.toLowerCase().includes(q)) || 
          (c.ownerEmail && c.ownerEmail.toLowerCase().includes(q)) || 
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.vak && c.vak.toLowerCase().includes(q)) ||
          (c.docentAfkorting && c.docentAfkorting.toLowerCase().includes(q))
        );
      })
      .sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  });

  openCreateSuperuserModal() {
    this.newCodeRole.set('Superuser');
    this.newCodeAfkorting.set('');
    this.newCodeName.set('');
    this.newCodeEmail.set('');
    this.newCodeVak.set('');
    this.showCreate.set(true);
  }

  /**
   * Stopt de luisteraar op /codes zodra het scherm weg is.
   *
   * Bleef eerder draaien nadat je van dit scherm wegnavigeerde. Bij het
   * uitloggen verdwijnt het sessiedocument en weigeren de regels de collectie;
   * de luisteraar meldde dat dan als fout in de console van een scherm dat niet
   * eens meer open stond.
   */
  private stopCodesLuisteraar: (() => void) | null = null;

  constructor() {
    this.stopCodesLuisteraar = onSnapshot(
      query(collection(db, 'codes'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        this.codes.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AccessCode)));
      },
      (error) => console.error('Luisteraar op codes gaf een fout:', error),
    );
  }

  ngOnDestroy() {
    this.stopCodesLuisteraar?.();
    this.stopCodesLuisteraar = null;
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
    const docent = this.geselecteerdeDocent();
    const geldigeDocent = Boolean(docent && docent.actief && afkortingIsGeldig(docent.afkorting));
    return Boolean(
      geldigeDocent &&
      this.newCodeName() &&
      this.newCodeEmail() &&
      (this.newCodeRole() !== 'Docent' || this.newCodeVak())
    );
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

    const docent = this.geselecteerdeDocent();
    if (!docent || !docent.actief) {
      this.melding.set({ soort: 'fout', tekst: 'Kies een geldige, actieve docent.' });
      return;
    }

    const code = this.generateCode();
    const newCode: AccessCode = {
      id: code,
      code,
      role: this.newCodeRole(),
      ownerName: docent.naam,
      ownerEmail: this.newCodeEmail(),
      docentAfkorting: normaliseerAfkorting(docent.afkorting),
      createdAt: new Date().toISOString(),
      active: NIEUWE_CODE_ACTIEF,
      used: false
    };

    if (this.newCodeRole() === 'Docent') {
      newCode.vak = this.newCodeVak();
    }

    try {
      await setDoc(doc(db, 'codes', code), newCode);
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
    this.newCodeAfkorting.set('');
    this.newCodeName.set('');
    this.newCodeEmail.set('');
    this.newCodeVak.set('');
    this.newCodeRole.set('Docent');
  }
}

