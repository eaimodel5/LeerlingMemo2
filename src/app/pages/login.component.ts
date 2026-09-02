import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-all duration-300 hover:shadow-2xl">
        <div class="p-8">
          <div class="flex flex-col items-center mb-8">
            <div class="w-16 h-16 bg-[#e87700] rounded-xl flex items-center justify-center mb-4 transform rotate-3 shadow-lg">
              <mat-icon class="text-white text-3xl h-auto w-auto">lock</mat-icon>
            </div>
            <h1 class="text-2xl font-bold text-[#1b2a47]">Emmauscollege</h1>
            <p class="text-slate-500 text-sm">Leerlingmemo Systeem</p>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-slate-100 mb-6">
            <button 
              (click)="tab.set('user')"
              [class.border-[#e87700]]="tab() === 'user'"
              [class.text-[#e87700]]="tab() === 'user'"
              class="flex-1 py-3 text-sm font-semibold border-b-2 transition-all">
              Inloggen
            </button>
            <button 
              (click)="tab.set('code')"
              [class.border-[#e87700]]="tab() === 'code'"
              [class.text-[#e87700]]="tab() === 'code'"
              class="flex-1 py-3 text-sm font-semibold border-b-2 transition-all">
              Toegangscode
            </button>
          </div>

          @if (tab() === 'user') {
            <form (submit)="onLogin()" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Gebruikersnaam</label>
                <div class="relative">
                  <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">person</mat-icon>
                  <input 
                    name="username"
                    [(ngModel)]="username"
                    class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20 focus:border-[#e87700] transition-all"
                    placeholder="Uw naam">
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Wachtwoord</label>
                <div class="relative">
                  <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">key</mat-icon>
                  <input 
                    name="password"
                    type="password"
                    [(ngModel)]="password"
                    class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20 focus:border-[#e87700] transition-all"
                    placeholder="Wachtwoord">
                </div>
              </div>
              
              @if (error()) {
                <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <mat-icon class="text-sm h-4 w-4">error</mat-icon>
                  <span>{{ error() }}</span>
                </div>
              }

              <button 
                type="submit"
                [disabled]="loading()"
                class="w-full py-3 bg-[#e87700] hover:bg-[#ff8a00] text-white font-bold rounded-xl shadow-lg shadow-[#e87700]/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {{ loading() ? 'Laden...' : 'Inloggen' }}
              </button>
            </form>
          } @else {
            <form (submit)="onLoginCode()" class="space-y-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">Toegangscode</label>
                <div class="relative">
                  <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">qr_code</mat-icon>
                  <input 
                    name="code"
                    [(ngModel)]="code"
                    class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20 focus:border-[#e87700] transition-all font-mono"
                    placeholder="0000-0000">
                </div>
                <p class="text-[10px] text-slate-400 mt-2 px-1 text-center italic">Deze code heeft u ontvangen van uw leerlingcoördinator.</p>
              </div>

              @if (error()) {
                <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <mat-icon class="text-sm h-4 w-4">error</mat-icon>
                  <span>{{ error() }}</span>
                </div>
              }

              <button 
                type="submit"
                [disabled]="loading()"
                class="w-full py-3 bg-[#1b2a47] hover:bg-[#2a3f6a] text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {{ loading() ? 'Validatie...' : 'Toegang krijgen' }}
              </button>
            </form>
          }
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  tab = signal<'user' | 'code'>('user');
  loading = signal(false);
  error = signal<string | null>(null);

  username = '';
  password = '';
  code = '';

  async onLogin() {
    if (!this.username || !this.password) return;
    this.loading.set(true);
    this.error.set(null);
    
    try {
      const success = await this.authService.login(this.username, this.password);
      if (success) {
        this.router.navigate(['/']);
      } else {
        this.error.set('Gebruikersnaam of wachtwoord onjuist.');
      }
    } catch {
      this.error.set('Er is een fout opgetreden.');
    } finally {
      this.loading.set(false);
    }
  }

  async onLoginCode() {
    if (!this.code) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      const success = await this.authService.loginWithCode(this.code);
      if (success) {
        this.router.navigate(['/']);
      } else {
        this.error.set('Ongeldige of verlopen toegangscode.');
      }
    } catch {
      this.error.set('Er is een fout opgetreden.');
    } finally {
      this.loading.set(false);
    }
  }
}
