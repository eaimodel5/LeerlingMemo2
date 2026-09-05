import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { vakSleutel } from '../utils/taak-status';
import { filterVoorDocent } from '../utils/docent-identiteit';

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [RouterLink, MatIconModule, CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Mijn Taken (To-Do)</h2>
      </header>

      <div class="flex-1 p-4 sm:p-8 space-y-6">
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-slate-800">Openstaande Taken</h3>
            <div class="flex gap-2">
              <select [ngModel]="filterPeriode()" (ngModelChange)="filterPeriode.set($event)" class="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="All">Alle periodes</option>
                <option value="TW1">TW1</option>
                <option value="TW2">TW2</option>
                <option value="TW3">TW3</option>
              </select>
            </div>
          </div>

          @if (openTaken().length === 0) {
            <div class="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <mat-icon class="text-4xl text-emerald-400 mb-2">done_all</mat-icon>
              <p class="font-medium text-slate-600">Je hebt momenteel geen openstaande taken.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (taak of openTaken(); track taak.id) {
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  <div class="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                      <h4 class="font-bold text-slate-800">{{taak.leerling}}</h4>
                      <p class="text-xs text-slate-500">{{taak.klas}} • {{taak.vak}}</p>
                    </div>
                    <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-800">
                      {{taak.periode}}
                    </span>
                  </div>
                  <div class="p-4 bg-white flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <p class="text-xs text-slate-600">Aangevraagd door mentor: <br/><strong>{{taak.mentorEmail}}</strong></p>
                      @if (taak.herinnerdOp) {
                        <p class="text-xs text-amber-700 mt-2 flex items-center gap-1.5">
                          <mat-icon class="text-[14px] w-[14px] h-[14px]">notifications_active</mat-icon>
                          Herinnering gestuurd op {{ taak.herinnerdOp | date:'d MMMM' }}
                        </p>
                      }
                    </div>
                    <a [routerLink]="getMemoRoute(taak.periode)" [queryParams]="{ leerling: taak.leerlingnummer, klas: taak.klas, taakId: taak.id }" class="w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                      <mat-icon class="text-[18px] w-[18px] h-[18px]">edit</mat-icon>
                      Vul memo in
                    </a>
                  </div>
                </div>
              }
            </div>
          }
        </div>

        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-8 opacity-75">
          <h3 class="text-md font-bold text-slate-700 mb-4">Ingevulde Taken (Recent)</h3>
          
          @if (closedTaken().length === 0) {
            <p class="text-sm text-slate-500">Geen afgeronde taken in de geselecteerde periode.</p>
          } @else {
            <div class="space-y-2">
              @for (taak of closedTaken(); track taak.id) {
                <div class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                  <div class="flex items-center gap-3">
                    <mat-icon class="text-emerald-500">check_circle</mat-icon>
                    <div>
                      <p class="text-sm font-bold text-slate-700">{{taak.leerling}} <span class="text-slate-400 font-normal">({{taak.klas}} - {{taak.vak}})</span></p>
                      <p class="text-xs text-slate-500">Periode: {{taak.periode}}</p>
                    </div>
                  </div>
                  <a [routerLink]="getMemoRoute(taak.periode)" [queryParams]="{ leerling: taak.leerlingnummer, klas: taak.klas, taakId: taak.id }" class="text-xs font-medium text-blue-600 hover:underline">Bekijken/Wijzigen</a>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class TeacherDashboardComponent {
  auth = inject(AuthService);
  dataService = inject(DataService);

  filterPeriode = signal('All');

  myTaken = computed(() => {
    const user = this.auth.currentUser();
    if (!user) return [];
    // Gebruikt centrale identiteitsresolver (PR 7): koppelt via docentAfkorting
    // indien aanwezig, met e-mailadres als tijdelijke overgangsfallback.
    let taken = filterVoorDocent(this.dataService.docentTaken(), user);

    if (this.filterPeriode() !== 'All') {
      taken = taken.filter(t => t.periode === this.filterPeriode());
    }
    return taken;
  });

  /** Voor welke leerling-vakcombinaties bestaat er al een memo van deze docent? */
  private ingevuldeSleutels = computed(() => {
    const sleutels = new Set<string>();
    for (const memo of this.dataService.memoTW1TW2()) {
      sleutels.add(vakSleutel(memo.leerlingnummer, memo.vak) + '|' + memo.toetsweek);
    }
    for (const memo of this.dataService.memoTW3()) {
      sleutels.add(vakSleutel(memo.leerlingnummer, memo.vak) + '|TW3');
    }
    return sleutels;
  });

  /**
   * Of een taak af is, blijkt uit het bestaan van de memo — niet uit het
   * statusveld. Dat veld werd alleen bijgewerkt wanneer de docent via de link
   * hieronder binnenkwam, waardoor een memo die op een andere manier was
   * ingevuld hier eeuwig als openstaand bleef staan.
   */
  private isAf(taak: { leerlingnummer: string; vak: string; periode: string }): boolean {
    return this.ingevuldeSleutels().has(vakSleutel(taak.leerlingnummer, taak.vak) + '|' + taak.periode);
  }

  openTaken = computed(() =>
    this.myTaken().filter(t => !this.isAf(t)).sort((a, b) => a.klas.localeCompare(b.klas, 'nl')));

  closedTaken = computed(() =>
    this.myTaken().filter(t => this.isAf(t))
      .sort((a, b) => new Date(b.gewijzigdOp).getTime() - new Date(a.gewijzigdOp).getTime())
      .slice(0, 10));

  getMemoRoute(periode: string): string {
    if (periode === 'TW1') return '/memo-1';
    if (periode === 'TW2') return '/memo-2';
    if (periode === 'TW3') return '/memo-3';
    return '/';
  }
}
