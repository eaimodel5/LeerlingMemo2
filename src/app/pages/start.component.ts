import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Welkom bij Leerlingmemo's</h2>
      </header>

      <div class="flex-1 p-4 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div class="space-y-2">
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 hidden sm:block">Schooljaar 2026-2027</h2>
          <p class="text-slate-500">Kies een taak om te beginnen.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <!-- Vakdocenten -->
          @if (!auth.isLoggedIn() || auth.hasRole('Docent') || auth.hasRole('Superuser')) {
            <div class="col-span-full border-b border-slate-200 pb-2 flex items-center gap-2">
              <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wide">Voor Vakdocenten</h3>
            </div>
            
            <a routerLink="/teacher-dashboard" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <mat-icon>checklist</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Mijn Taken (To-Do)</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Bekijk welke leerlingmemo's door mentoren voor jou zijn klaargezet.</p>
            </a>

            <a routerLink="/memo-1" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <mat-icon>edit_document</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Memo TW1/TW2 invullen</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Registreer signalen en acties na Toetsweek 1 of 2.</p>
            </a>

            <a routerLink="/memo-3" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <mat-icon>rate_review</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Memo TW3 invullen</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Inclusief doorstroomtoelichting voor de overgang.</p>
            </a>
          }

          <!-- Mentoren -->
          @if (auth.hasRole('Mentor') || auth.hasRole('Coordinator') || auth.hasRole('Superuser')) {
            <div class="col-span-full border-b border-slate-200 pb-2 mt-6 flex items-center gap-2">
              <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wide">Voor Mentoren</h3>
            </div>

            <a routerLink="/mentor-overview" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <mat-icon>view_list</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Mentoroverzicht</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Bekijk alle vakdocent memo's gebundeld per leerling.</p>
            </a>

            <a routerLink="/mentor-prep" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <mat-icon>meeting_room</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Voorbereiding</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Invoer ter voorbereiding voor de rapportvergadering.</p>
            </a>

            <a routerLink="/progress-plan" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <mat-icon>trending_up</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Voortgangsplan</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Leg gemaakte afspraken met de leerling / ouders vast.</p>
            </a>

            <a routerLink="/magister-export" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-emerald-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <mat-icon>content_copy</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Magister-export</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Genereer geaggregeerde tekst om te kopiëren naar Magister.</p>
            </a>
          }

          <!-- Beheer -->
          @if (auth.hasRole('Superuser')) {
            <div class="col-span-full border-b border-slate-200 pb-2 mt-6 flex items-center gap-2">
              <h3 class="text-sm font-bold text-slate-400 uppercase tracking-wide">Voor Beheerders</h3>
            </div>

            <a routerLink="/manage-students" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-400 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-slate-600 group-hover:text-white transition-colors">
                <mat-icon>group</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Beheer leerlingen</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Lijst van leerlingen met klas en mentor bewerken.</p>
            </a>

            <a routerLink="/manage-teachers" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-400 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-slate-600 group-hover:text-white transition-colors">
                <mat-icon>assignment_ind</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Docenten & Vakken</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Koppel docenten/vakken aan klassen.</p>
            </a>

            <a routerLink="/superuser" class="group flex flex-col p-6 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-purple-300 hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div class="h-12 w-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <mat-icon>vpn_key</mat-icon>
              </div>
              <h4 class="text-sm font-bold text-slate-800 mb-1">Toegangscodes & Superuser</h4>
              <p class="text-xs text-slate-500 leading-relaxed max-w-[200px]">Beheer inlogcodes en bekijk de actieve superuser-code.</p>
            </a>
          }

        </div>
      </div>
    </div>
  `
})
export class StartComponent {
  auth = inject(AuthService);
}
