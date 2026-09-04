import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../services/data.service';
import { bepaalSignalen, voortgangPerKlas, Ernst } from '../utils/signalering';
import { downloadCsv } from '../utils/csv';

/**
 * Overzicht voor de beheerder.
 *
 * Het beheerdersscherm kon tot nu toe één ding: toegangscodes aanmaken. Wie
 * wilde weten hoe ver een klas was, moest per klas en per leerling gaan kijken,
 * en waaróm een scherm leeg bleef was nergens te zien.
 *
 * Dit scherm leest alleen; het wijzigt niets. De signalering is het deel dat in
 * de praktijk het meeste scheelt: het maakt zichtbaar welke koppeling ontbreekt
 * in plaats van een leeg overzicht te tonen zonder uitleg.
 */
@Component({
  selector: 'app-beheer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Beheerdersoverzicht</h2>
        <button (click)="exporteerSignalen()" [disabled]="signalen().length === 0"
                class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50">
          <mat-icon class="text-[16px] w-[16px] h-[16px]">download</mat-icon>
          Signalering naar Excel
        </button>
      </header>

      <div class="flex-1 p-4 sm:p-8 space-y-8">

        <!-- Keuze -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
          <div>
            <label for="dash-jaar" class="block text-xs font-semibold text-slate-600 mb-1">Schooljaar</label>
            <select id="dash-jaar" [ngModel]="schooljaar()" (ngModelChange)="schooljaar.set($event)" class="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              @for (jaar of beschikbareJaren(); track jaar) { <option [value]="jaar">{{ jaar }}</option> }
            </select>
          </div>
          <div>
            <label for="dash-periode" class="block text-xs font-semibold text-slate-600 mb-1">Periode</label>
            <select id="dash-periode" [ngModel]="periode()" (ngModelChange)="periode.set($event)" class="p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="TW1">TW1</option>
              <option value="TW2">TW2</option>
              <option value="TW3">TW3</option>
            </select>
          </div>
        </div>

        <!-- Kerncijfers -->
        <section>
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">In dit schooljaar</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-px bg-slate-200 border border-slate-200 rounded-xl overflow-hidden">
            @for (cijfer of kerncijfers(); track cijfer.label) {
              <div class="bg-white p-4">
                <p class="text-2xl font-bold text-slate-900 tabular-nums leading-none">{{ cijfer.waarde }}</p>
                <p class="text-xs text-slate-600 mt-1.5 leading-snug">{{ cijfer.label }}</p>
              </div>
            }
          </div>
        </section>

        <!-- Signalering -->
        <section>
          <div class="flex items-baseline justify-between mb-3 gap-4 flex-wrap">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wide">Wat aandacht nodig heeft</h3>
            <span class="text-xs text-slate-500">{{ signalen().length }} {{ signalen().length === 1 ? 'signaal' : 'signalen' }}</span>
          </div>

          @if (signalen().length === 0) {
            <div class="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <mat-icon class="text-emerald-500 text-4xl mb-2">check_circle</mat-icon>
              <p class="text-sm font-medium text-slate-700">Geen gaten gevonden in de gegevens van {{ schooljaar() }}.</p>
            </div>
          } @else {
            <div class="space-y-2">
              @for (signaal of signalen(); track signaal.code) {
                <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <button (click)="wisselSignaal(signaal.code)" class="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3">
                    <span class="mt-0.5 shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border"
                          [class]="ernstKleur(signaal.ernst)">
                      <mat-icon class="text-[13px] w-[13px] h-[13px]">{{ ernstIcoon(signaal.ernst) }}</mat-icon>
                      {{ ernstLabel(signaal.ernst) }}
                    </span>
                    <span class="flex-1 min-w-0">
                      <span class="block text-sm font-semibold text-slate-800">{{ signaal.titel }}</span>
                      <span class="block text-xs text-slate-600 mt-0.5">{{ signaal.gevolg }}</span>
                    </span>
                    <span class="text-lg font-bold text-slate-900 tabular-nums shrink-0">{{ signaal.aantal }}</span>
                    <mat-icon class="text-slate-400 shrink-0 text-[20px] w-[20px] h-[20px]">{{ open() === signaal.code ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </button>

                  @if (open() === signaal.code) {
                    <div class="px-4 pb-4 pt-1 border-t border-slate-100 text-sm space-y-3">
                      <div>
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Wat je eraan kunt doen</p>
                        <p class="text-slate-700">{{ signaal.oplossing }}</p>
                      </div>
                      <div>
                        <p class="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Voorbeelden</p>
                        <ul class="text-slate-700 text-[13px] space-y-0.5">
                          @for (voorbeeld of signaal.voorbeelden; track voorbeeld) { <li>· {{ voorbeeld }}</li> }
                        </ul>
                        @if (signaal.aantal > signaal.voorbeelden.length) {
                          <p class="text-xs text-slate-500 mt-1">en nog {{ signaal.aantal - signaal.voorbeelden.length }} andere</p>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </section>

        <!-- Voortgang per klas -->
        <section>
          <div class="flex items-baseline justify-between mb-3 gap-4 flex-wrap">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wide">Ingevulde memo's per klas — {{ periode() }}</h3>
            <span class="text-xs text-slate-500">{{ totaalIngevuld() }} van {{ totaalVerwacht() }} verwacht</span>
          </div>

          @if (voortgang().length === 0) {
            <div class="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              Nog geen klassen met leerlingen in {{ schooljaar() }}.
            </div>
          } @else {
            <div class="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table class="w-full text-sm min-w-[620px]">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200">
                    <th class="text-left px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Klas</th>
                    <th class="text-right px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Leerlingen</th>
                    <th class="text-left px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide w-1/2">Ingevuld</th>
                    <th class="text-right px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Taken open</th>
                    <th class="text-left px-4 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Invoer</th>
                  </tr>
                </thead>
                <tbody>
                  @for (rij of voortgang(); track rij.klas) {
                    <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td class="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{{ rij.klas }}</td>
                      <td class="px-4 py-2.5 text-right text-slate-600 tabular-nums">{{ rij.leerlingen }}</td>
                      <td class="px-4 py-2.5">
                        <div class="flex items-center gap-3">
                          <div class="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[80px]">
                            <div class="h-full bg-blue-600 rounded-full transition-[width]" [style.width.%]="percentage(rij)"></div>
                          </div>
                          <span class="text-xs text-slate-600 tabular-nums whitespace-nowrap w-20 text-right">
                            {{ rij.ingevuldeMemos }} / {{ rij.verwachteMemos }}
                          </span>
                        </div>
                      </td>
                      <td class="px-4 py-2.5 text-right tabular-nums" [class.text-amber-700]="rij.openstaandeTaken > 0" [class.font-medium]="rij.openstaandeTaken > 0" [class.text-slate-400]="rij.openstaandeTaken === 0">
                        {{ rij.openstaandeTaken }}
                      </td>
                      <td class="px-4 py-2.5 whitespace-nowrap">
                        @if (rij.opSlot) {
                          <span class="inline-flex items-center gap-1 text-xs text-red-700"><mat-icon class="text-[14px] w-[14px] h-[14px]">lock</mat-icon> Gesloten</span>
                        } @else {
                          <span class="inline-flex items-center gap-1 text-xs text-slate-400"><mat-icon class="text-[14px] w-[14px] h-[14px]">lock_open</mat-icon> Open</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        <!-- Snelkoppelingen -->
        <section>
          <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Beheer</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a routerLink="/manage-students" class="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 hover:shadow-sm transition-all flex items-center gap-3">
              <mat-icon class="text-slate-500">group</mat-icon>
              <span class="text-sm font-medium text-slate-800">Leerlingen</span>
            </a>
            <a routerLink="/manage-teachers" class="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 hover:shadow-sm transition-all flex items-center gap-3">
              <mat-icon class="text-slate-500">school</mat-icon>
              <span class="text-sm font-medium text-slate-800">Docenten &amp; vakken</span>
            </a>
            <a routerLink="/superuser" class="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 hover:shadow-sm transition-all flex items-center gap-3">
              <mat-icon class="text-slate-500">vpn_key</mat-icon>
              <span class="text-sm font-medium text-slate-800">Toegangscodes</span>
            </a>
          </div>
        </section>
      </div>
    </div>
  `
})
export class BeheerDashboardComponent {
  private dataService = inject(DataService);

  schooljaar = signal('2026-2027');
  periode = signal('TW1');
  open = signal<string | null>(null);

  /** Alle schooljaren die in de gegevens voorkomen, nieuwste eerst. */
  beschikbareJaren = computed(() => {
    const jaren = new Set(this.dataService.leerlingen().map(l => l.schooljaar).filter(Boolean));
    jaren.add('2026-2027');
    return [...jaren].sort().reverse();
  });

  private invoer = computed(() => ({
    leerlingen: this.dataService.leerlingen(),
    docentVakken: this.dataService.docentVakken(),
    memoTW1TW2: this.dataService.memoTW1TW2(),
    memoTW3: this.dataService.memoTW3(),
    docentTaken: this.dataService.docentTaken(),
    schooljaar: this.schooljaar()
  }));

  signalen = computed(() => bepaalSignalen(this.invoer()));

  voortgang = computed(() => voortgangPerKlas({
    ...this.invoer(),
    periode: this.periode(),
    opSlot: (klas: string) => {
      const id = `${klas}_${this.periode()}_${this.schooljaar()}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      return this.dataService.classLocks().find(l => l.id === id)?.isLocked ?? false;
    }
  }));

  totaalIngevuld = computed(() => this.voortgang().reduce((som, rij) => som + rij.ingevuldeMemos, 0));
  totaalVerwacht = computed(() => this.voortgang().reduce((som, rij) => som + rij.verwachteMemos, 0));

  kerncijfers = computed(() => {
    const jaar = this.schooljaar();
    const leerlingen = this.dataService.leerlingen().filter(l => l.schooljaar === jaar && l.actief);
    const koppelingen = this.dataService.docentVakken().filter(dv => dv.schooljaar === jaar && dv.actief);
    const memos = this.periode() === 'TW3'
      ? this.dataService.memoTW3().filter(m => m.schooljaar === jaar)
      : this.dataService.memoTW1TW2().filter(m => m.schooljaar === jaar && m.toetsweek === this.periode());

    return [
      { label: 'Actieve leerlingen', waarde: leerlingen.length },
      { label: 'Klassen', waarde: new Set(leerlingen.map(l => l.klas).filter(Boolean)).size },
      { label: 'Docent-vakkoppelingen', waarde: koppelingen.length },
      { label: `Memo's in ${this.periode()}`, waarde: memos.length },
      { label: 'Openstaande taken', waarde: this.voortgang().reduce((som, rij) => som + rij.openstaandeTaken, 0) }
    ];
  });

  percentage(rij: { ingevuldeMemos: number; verwachteMemos: number }): number {
    if (rij.verwachteMemos === 0) return 0;
    return Math.round((rij.ingevuldeMemos / rij.verwachteMemos) * 100);
  }

  wisselSignaal(code: string) {
    this.open.set(this.open() === code ? null : code);
  }

  ernstLabel(ernst: Ernst) {
    return ernst === 'blokkerend' ? 'Blokkerend' : ernst === 'aandacht' ? 'Aandacht' : 'Ter info';
  }

  ernstIcoon(ernst: Ernst) {
    return ernst === 'blokkerend' ? 'error' : ernst === 'aandacht' ? 'warning' : 'info';
  }

  ernstKleur(ernst: Ernst) {
    return ernst === 'blokkerend' ? 'bg-red-50 text-red-700 border-red-200'
      : ernst === 'aandacht' ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-50 text-slate-600 border-slate-200';
  }

  exporteerSignalen() {
    const rijen: string[][] = [['Ernst', 'Signaal', 'Aantal', 'Gevolg', 'Op te lossen door', 'Voorbeelden']];
    for (const signaal of this.signalen()) {
      rijen.push([
        this.ernstLabel(signaal.ernst), signaal.titel, String(signaal.aantal),
        signaal.gevolg, signaal.oplossing, signaal.voorbeelden.join(' | ')
      ]);
    }
    downloadCsv(`Signalering_${this.schooljaar()}.csv`, rijen);
  }
}
