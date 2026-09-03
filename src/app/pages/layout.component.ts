import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';
import { DataService } from '../services/data.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, CommonModule],
  template: `
    <div class="flex h-screen w-full bg-slate-50 font-sans text-[#1b2a47] overflow-hidden">
      <!-- Sidebar Navigation -->
      <nav class="w-20 hover:w-64 transition-[width] duration-300 ease-in-out bg-[#0d1e3a] text-white flex flex-col shrink-0 group z-50 relative shadow-xl overflow-hidden">
        <div class="px-5 border-b border-[#1b3054] bg-white flex items-center h-20 min-w-[256px] shrink-0">
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0 mr-4">
             <path d="M10 32C10 32 15 20 22 8" stroke="#1b2a47" stroke-width="1.5" stroke-linecap="round"/>
             <path d="M16 32C16 32 21 20 28 8" stroke="#1b2a47" stroke-width="1.5" stroke-linecap="round"/>
             <path d="M22 32C22 32 27 20 34 8" stroke="#1b2a47" stroke-width="1.5" stroke-linecap="round"/>
             <path d="M4 28Q 20 24 38 24" stroke="#e87700" fill="none" stroke-width="2" stroke-linecap="round" />
             <circle cx="23" cy="7" r="1.5" fill="#1b2a47"/>
             <circle cx="29" cy="7" r="1.5" fill="#1b2a47"/>
             <circle cx="35" cy="7" r="1.5" fill="#1b2a47"/>
          </svg>
          <div class="flex flex-col pt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
             <span class="text-xl font-bold tracking-tight text-[#e87700] leading-none font-sans">emmauscollege</span>
             <span class="text-xs font-bold tracking-wider text-[#1b2a47] leading-none mt-0.5 self-end font-sans">rotterdam</span>
          </div>
        </div>
        <div class="flex-1 py-4 overflow-y-auto custom-scrollbar overflow-x-hidden min-w-[256px]">
          <div class="px-6 py-2 text-[10px] font-bold text-[#5c7bb0] uppercase tracking-wider mb-1 text-center group-hover:text-left transition-all">Menu</div>
          
          <a routerLink="/" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]" [routerLinkActiveOptions]="{exact: true}"
             class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Start">
            <mat-icon class="mr-6 shrink-0 text-[#5c7bb0] group-[.active]:text-[#e87700]">home</mat-icon> 
            <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Start</span>
          </a>

          @if (!auth.isLoggedIn() || auth.hasRole('Docent') || auth.hasRole('Superuser')) {
            <div class="px-6 py-2 mt-4 text-[10px] font-bold text-[#5c7bb0] uppercase tracking-wider mb-1 text-center group-hover:text-left transition-all">Docenten</div>
            <a routerLink="/teacher-dashboard" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Mijn taken">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">checklist</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Mijn taken</span>
            </a>
            <a routerLink="/memo-1" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Memo TW1">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">edit_document</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Memo TW1</span>
            </a>
            <a routerLink="/memo-2" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Memo TW2">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">edit_document</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Memo TW2</span>
            </a>
            <a routerLink="/memo-3" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Memo TW3">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">assignment</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Memo TW3</span>
            </a>
          }

          @if (auth.hasRole('Mentor') || auth.hasRole('Coordinator') || auth.hasRole('Superuser')) {
            <div class="px-6 py-2 mt-4 text-[10px] font-bold text-[#5c7bb0] uppercase tracking-wider mb-1 text-center group-hover:text-left transition-all">Mentoren</div>
            <a routerLink="/mentor-overview" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Mentoroverzicht">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">manage_search</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Mentoroverzicht</span>
            </a>
            <a routerLink="/mentor-prep" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Voorbereiding">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">folder</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Voorbereiding</span>
            </a>
            <a routerLink="/progress-plan" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Voortgangsplan">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">track_changes</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Voortgangsplan</span>
            </a>
            <a routerLink="/magister-export" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Magister-export">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">ios_share</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Magister-export</span>
            </a>
          }

          @if (auth.hasRole('Superuser')) {
            <div class="px-6 py-2 mt-4 text-[10px] font-bold text-[#5c7bb0] uppercase tracking-wider mb-1 text-center group-hover:text-left transition-all">Beheer</div>
            <a routerLink="/superuser" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Codes Beheren">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">vpn_key</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Codes Beheren</span>
            </a>
            <a routerLink="/manage-students" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Leerlingen">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">group</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Leerlingen</span>
            </a>
            <a routerLink="/manage-teachers" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Docenten/Vakken">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">school</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Docenten/Vakken</span>
            </a>
            <a routerLink="/power-fx" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
               class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="PowerFx Formules">
              <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">bolt</mat-icon>
              <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">PowerFx Formules</span>
            </a>
          }
          
          <div class="px-6 py-2 mt-4 text-[10px] font-bold text-[#5c7bb0] uppercase tracking-wider mb-1 text-center group-hover:text-left transition-all">Support</div>
          <a routerLink="/handleiding" routerLinkActive="bg-[#152a4f] text-[#e87700] !border-l-[#e87700]"
             class="flex items-center px-6 py-3 hover:bg-[#152a4f] text-slate-300 transition-all border-l-4 border-transparent min-w-max" title="Handleiding">
            <mat-icon class="mr-6 shrink-0 text-[#5c7bb0]">menu_book</mat-icon>
            <span class="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Handleiding</span>
          </a>
        </div>
        
        <div class="p-6 border-t border-[#1b3054] bg-[#09152b] shrink-0 min-w-[256px] flex items-center justify-between group-hover:pr-4 transition-all">
          @if (auth.isLoggedIn()) {
            <div class="flex items-center overflow-hidden">
              <div class="w-8 h-8 shrink-0 rounded-full bg-[#1b3054] flex items-center justify-center text-xs font-bold text-[#e87700]">
                <mat-icon class="text-[18px] w-[18px] h-[18px]">person</mat-icon>
              </div>
              <div class="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
                <p class="text-sm font-bold truncate text-slate-200">{{ auth.currentUser()?.name || 'Gast' }}</p>
                <p class="text-[10px] text-[#5c7bb0] uppercase font-semibold">{{ auth.currentUser()?.role || 'Onbekend' }}</p>
              </div>
            </div>
            <button (click)="auth.logout()" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition-all ml-2" title="Uitloggen">
              <mat-icon class="text-[18px] w-[18px] h-[18px]">logout</mat-icon>
            </button>
          } @else {
            <div class="flex items-center overflow-hidden">
              <div class="w-8 h-8 shrink-0 rounded-full bg-[#1b3054] flex items-center justify-center text-xs font-bold text-[#e87700]">
                <mat-icon class="text-[18px] w-[18px] h-[18px]">person_outline</mat-icon>
              </div>
              <div class="ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
                <p class="text-sm font-bold truncate text-slate-200">Docent</p>
                <p class="text-[10px] text-[#5c7bb0] uppercase font-semibold">Publiek toegang</p>
              </div>
            </div>
            <a routerLink="/login" class="opacity-0 group-hover:opacity-100 text-[#e87700] hover:text-[#ff8a00] transition-all ml-2 text-xs font-bold uppercase tracking-wider" title="Inloggen">
              Inloggen
            </a>
          }
        </div>
      </nav>

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col bg-slate-50 overflow-hidden text-slate-800">
        @if (data.verbindingsfout(); as fout) {
          <div class="bg-red-600 text-white px-6 py-2.5 flex items-center gap-3 text-sm shrink-0 print:hidden">
            <mat-icon class="text-[18px] w-[18px] h-[18px]">cloud_off</mat-icon>
            <span class="flex-1">{{ fout }} Wat je nu invult wordt mogelijk niet bewaard.</span>
            <button (click)="herlaad()" class="underline font-medium hover:no-underline whitespace-nowrap">Opnieuw laden</button>
          </div>
        }
        <div class="flex-1 overflow-y-auto overflow-x-hidden">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class LayoutComponent {
  auth = inject(AuthService);
  data = inject(DataService);

  herlaad() {
    if (typeof window !== 'undefined') window.location.reload();
  }
}
