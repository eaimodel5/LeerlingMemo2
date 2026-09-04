import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { Docent } from '../models/data.models';
import { parseCsv, downloadCsv } from '../utils/csv';
import { Melding, meldingBijFout, MELDING_BEVESTIGD } from '../utils/opslag';
import {
  AfkortingFout,
  controleerAfkorting,
  normaliseerAfkorting,
  toonAfkorting,
  uitlegBijAfkortingFout,
  zelfdeAfkorting,
} from '../utils/docent-afkorting';

/** Een docentnaam uit de koppelingen waar nog geen afkorting bij hoort. */
export interface OntbrekendeDocent {
  naam: string;
  email: string;
  aantalKoppelingen: number;
}

@Component({
  selector: 'app-manage-docenten',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 hidden sm:flex">
        <div>
          <h2 class="text-lg font-semibold text-slate-700">Docenten</h2>
          <p class="text-xs text-slate-500">Elke docent met zijn schoolafkorting</p>
        </div>
        <div class="flex gap-2">
          <button (click)="bestand.click()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">upload_file</mat-icon> Importeer CSV
          </button>
          <input type="file" #bestand class="hidden" accept=".csv" (change)="importeer($event)">
          <button (click)="downloadSjabloon()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">download</mat-icon> Sjabloon
          </button>
          <button (click)="downloadLijst()" [disabled]="docenten().length === 0" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">file_download</mat-icon> Exporteer
          </button>
          <button (click)="nieuw()" class="px-3 py-1.5 text-xs font-medium text-white bg-[#0d1e3a] hover:bg-[#1b3054] rounded-md shadow-sm transition-colors flex items-center gap-1.5">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">add</mat-icon> Nieuw
          </button>
        </div>
      </header>

      <div class="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        @if (melding(); as m) {
          <div class="p-3 rounded-lg text-xs flex items-start gap-2 border"
               [class.bg-emerald-50]="m.soort === 'ok'" [class.text-emerald-800]="m.soort === 'ok'" [class.border-emerald-200]="m.soort === 'ok'"
               [class.bg-amber-50]="m.soort === 'wacht'" [class.text-amber-800]="m.soort === 'wacht'" [class.border-amber-200]="m.soort === 'wacht'"
               [class.bg-red-50]="m.soort === 'fout'" [class.text-red-700]="m.soort === 'fout'" [class.border-red-200]="m.soort === 'fout'">
            <mat-icon class="text-[16px] w-[16px] h-[16px] mt-0.5">{{ m.soort === 'fout' ? 'error' : 'info' }}</mat-icon>
            <span class="flex-1 whitespace-pre-line">{{ m.tekst }}</span>
            <button type="button" (click)="melding.set(null)" class="opacity-60 hover:opacity-100" title="Sluiten">
              <mat-icon class="text-[16px] w-[16px] h-[16px]">close</mat-icon>
            </button>
          </div>
        }

        <!-- Wat er nog niet gekoppeld is -->
        @if (zonderAfkorting().length > 0) {
          <div class="bg-white border border-amber-200 rounded-xl shadow-sm">
            <div class="px-5 py-4 border-b border-amber-100 bg-amber-50/60 rounded-t-xl">
              <h3 class="text-sm font-bold text-amber-900 flex items-center gap-2">
                <mat-icon class="text-[18px] w-[18px] h-[18px]">help_outline</mat-icon>
                {{ zonderAfkorting().length }} {{ zonderAfkorting().length === 1 ? 'docent' : 'docenten' }} uit de koppelingen zonder afkorting
              </h3>
              <p class="text-xs text-amber-800 mt-1 max-w-3xl">
                Deze namen staan wel bij Docenten/Vakken maar hebben hier nog geen afkorting.
                Vul ze zelf in — de afkorting die de school gebruikt is leidend, en die valt
                niet uit een naam af te leiden.
              </p>
            </div>
            <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              @for (ontbreekt of zonderAfkorting(); track ontbreekt.email + ontbreekt.naam) {
                <div class="px-5 py-3 flex items-center justify-between gap-4">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-800 truncate">{{ ontbreekt.naam }}</div>
                    <div class="text-xs text-slate-500 truncate">{{ ontbreekt.email || 'geen e-mailadres' }} · {{ ontbreekt.aantalKoppelingen }} {{ ontbreekt.aantalKoppelingen === 1 ? 'koppeling' : 'koppelingen' }}</div>
                  </div>
                  <button (click)="nieuwVoor(ontbreekt)" class="shrink-0 px-2.5 py-1 text-xs font-medium text-amber-800 bg-white hover:bg-amber-50 border border-amber-300 rounded transition-colors">
                    Afkorting toevoegen
                  </button>
                </div>
              }
            </div>
          </div>
        }

        <!-- Zoeken -->
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
          <input [ngModel]="zoek()" (ngModelChange)="zoek.set($event)" placeholder="Zoek op afkorting of naam..."
                 class="flex-1 min-w-[220px] px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
          <label class="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" [ngModel]="toonInactief()" (ngModelChange)="toonInactief.set($event)" class="rounded border-slate-300">
            Ook niet-actieve docenten
          </label>
          <span class="text-xs text-slate-500">{{ zichtbaar().length }} van {{ docenten().length }}</span>
        </div>

        <!-- Lijst -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th class="px-6 py-3">Afkorting</th>
                <th class="px-6 py-3">Naam</th>
                <th class="px-6 py-3">E-mail (tijdelijk)</th>
                <th class="px-6 py-3">Status</th>
                <th class="px-6 py-3 text-right">Acties</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (docent of zichtbaar(); track docent.afkorting) {
                <tr class="hover:bg-slate-50 transition-colors" [class.opacity-60]="!docent.actief">
                  <td class="px-6 py-3 font-mono font-bold text-[#e87700]">{{ toon(docent.afkorting) }}</td>
                  <td class="px-6 py-3 font-semibold text-slate-800">{{ docent.naam }}</td>
                  <td class="px-6 py-3 text-xs text-slate-500">{{ docent.email || '—' }}</td>
                  <td class="px-6 py-3">
                    @if (docent.actief) {
                      <span class="px-2 py-1 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Actief</span>
                    } @else {
                      <span class="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">Niet actief</span>
                    }
                  </td>
                  <td class="px-6 py-3 text-right whitespace-nowrap">
                    <button (click)="bewerk(docent)" class="text-blue-600 hover:text-blue-800 mx-1" title="Bewerken">
                      <mat-icon class="text-[18px] w-[18px] h-[18px]">edit</mat-icon>
                    </button>
                    @if (magVerwijderen()) {
                      <button (click)="verwijder(docent)" class="text-red-500 hover:text-red-700 mx-1" title="Verwijderen">
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">delete</mat-icon>
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-6 py-16 text-center text-slate-400 italic">
                    @if (docenten().length === 0) {
                      Nog geen docenten. Voeg ze los toe, of importeer een CSV met afkorting en naam.
                    } @else {
                      Geen docenten gevonden.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Formulier -->
      @if (formulier(); as f) {
        <div class="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 class="text-base font-bold text-slate-800 mb-1">{{ f.bestaand ? 'Docent bewerken' : 'Nieuwe docent' }}</h3>
            <p class="text-xs text-slate-500 mb-4">De afkorting is de sleutel; die van de school is leidend.</p>

            <label class="block text-xs font-bold text-slate-500 uppercase mb-1" for="veld-afkorting">Afkorting</label>
            <input id="veld-afkorting" [ngModel]="f.afkorting" (ngModelChange)="zetVeld('afkorting', $event)"
                   [disabled]="f.bestaand" placeholder="vis"
                   class="w-full px-3 py-2 mb-1 text-sm font-mono uppercase border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100">
            @if (f.bestaand) {
              <p class="text-[11px] text-slate-400 mb-3">De afkorting is het kenmerk van deze docent en kan niet worden gewijzigd. Klopt hij niet, verwijder de docent en maak een nieuwe aan.</p>
            } @else if (afkortingFout(); as fout) {
              <p class="text-[11px] text-red-600 mb-3">{{ uitleg(fout) }}</p>
            } @else {
              <p class="text-[11px] text-slate-400 mb-3">Wordt opgeslagen als <span class="font-mono">{{ genormaliseerd() }}</span>.</p>
            }

            <label class="block text-xs font-bold text-slate-500 uppercase mb-1" for="veld-naam">Naam</label>
            <input id="veld-naam" [ngModel]="f.naam" (ngModelChange)="zetVeld('naam', $event)" placeholder="Hans Visser"
                   class="w-full px-3 py-2 mb-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">

            <label class="block text-xs font-bold text-slate-500 uppercase mb-1" for="veld-email">E-mail <span class="normal-case font-normal text-slate-400">(tijdelijk, om bestaande gegevens te herkennen)</span></label>
            <input id="veld-email" [ngModel]="f.email" (ngModelChange)="zetVeld('email', $event)" placeholder="visser@school.nl"
                   class="w-full px-3 py-2 mb-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">

            <label class="flex items-center gap-2 text-sm text-slate-700 mb-5">
              <input type="checkbox" [ngModel]="f.actief" (ngModelChange)="zetVeld('actief', $event)" class="rounded border-slate-300">
              Actief
            </label>

            <div class="flex justify-end gap-2">
              <button (click)="formulier.set(null)" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md">Annuleren</button>
              <button (click)="bewaar()" [disabled]="!kanBewaren() || bezig()"
                      class="px-4 py-2 text-sm font-medium text-white bg-[#0d1e3a] hover:bg-[#1b3054] rounded-md disabled:opacity-50">
                Opslaan
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ManageDocentenComponent {
  private dataService = inject(DataService);
  private authService = inject(AuthService);

  melding = signal<Melding | null>(null);
  bezig = signal(false);
  zoek = signal('');
  toonInactief = signal(false);

  formulier = signal<{ afkorting: string; naam: string; email: string; actief: boolean; bestaand: boolean } | null>(null);

  magVerwijderen = computed(() => this.authService.mag('leerlingenVerwijderen'));

  docenten = computed(() =>
    [...this.dataService.docenten()].sort((a, b) => a.afkorting.localeCompare(b.afkorting, 'nl')));

  zichtbaar = computed(() => {
    const term = this.zoek().trim().toLowerCase();
    return this.docenten().filter(d => {
      if (!this.toonInactief() && !d.actief) return false;
      if (!term) return true;
      return d.afkorting.includes(term) || d.naam.toLowerCase().includes(term);
    });
  });

  /**
   * Docentnamen uit de koppelingen waar nog geen afkorting bij hoort.
   *
   * Bewust geen gok: er wordt uit `Hans Visser` geen `vis` afgeleid. De school
   * heeft die afkortingen al, en een verkeerde gok is later niet meer te
   * onderscheiden van een goede.
   */
  zonderAfkorting = computed<OntbrekendeDocent[]>(() => {
    const bekend = this.dataService.docenten();
    const perDocent = new Map<string, OntbrekendeDocent>();

    for (const koppeling of this.dataService.docentVakken()) {
      const email = (koppeling.docentEmail ?? '').trim();
      const naam = (koppeling.docentNaam ?? '').trim();
      if (!naam && !email) continue;

      const alBekend = bekend.some(
        d =>
          (email !== '' && (d.email ?? '').trim().toLowerCase() === email.toLowerCase()) ||
          d.naam.trim().toLowerCase() === naam.toLowerCase(),
      );
      if (alBekend) continue;

      const sleutel = (email || naam).toLowerCase();
      const bestaand = perDocent.get(sleutel) ?? { naam, email, aantalKoppelingen: 0 };
      bestaand.aantalKoppelingen += 1;
      perDocent.set(sleutel, bestaand);
    }

    return [...perDocent.values()].sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
  });

  genormaliseerd = computed(() => normaliseerAfkorting(this.formulier()?.afkorting));

  afkortingFout = computed<AfkortingFout | null>(() => {
    const f = this.formulier();
    if (!f || f.bestaand) return null;
    return controleerAfkorting(f.afkorting, this.docenten().map(d => d.afkorting));
  });

  kanBewaren = computed(() => {
    const f = this.formulier();
    if (!f) return false;
    return this.afkortingFout() === null && f.naam.trim() !== '';
  });

  toon(afkorting: string) {
    return toonAfkorting(afkorting);
  }

  uitleg(fout: AfkortingFout) {
    return uitlegBijAfkortingFout(fout);
  }

  zetVeld(veld: 'afkorting' | 'naam' | 'email' | 'actief', waarde: string | boolean) {
    const f = this.formulier();
    if (!f) return;
    this.formulier.set({ ...f, [veld]: waarde });
  }

  nieuw() {
    this.formulier.set({ afkorting: '', naam: '', email: '', actief: true, bestaand: false });
  }

  /** Nieuw formulier, voorgevuld met wat we uit de koppeling weten — behalve de afkorting. */
  nieuwVoor(ontbreekt: OntbrekendeDocent) {
    this.formulier.set({ afkorting: '', naam: ontbreekt.naam, email: ontbreekt.email, actief: true, bestaand: false });
  }

  bewerk(docent: Docent) {
    this.formulier.set({
      afkorting: docent.afkorting,
      naam: docent.naam,
      email: docent.email ?? '',
      actief: docent.actief,
      bestaand: true,
    });
  }

  async bewaar() {
    const f = this.formulier();
    if (!f || !this.kanBewaren()) return;

    this.bezig.set(true);
    this.melding.set(null);
    try {
      const afkorting = normaliseerAfkorting(f.afkorting);
      const bestaand = this.docenten().find(d => zelfdeAfkorting(d.afkorting, afkorting));
      await this.dataService.saveDocent({
        afkorting,
        naam: f.naam.trim(),
        email: f.email.trim() || undefined,
        actief: f.actief,
        aangemaaktOp: bestaand?.aangemaaktOp,
      });
      this.melding.set(MELDING_BEVESTIGD(`Docent ${toonAfkorting(afkorting)}`));
      this.formulier.set(null);
    } catch (e) {
      this.melding.set(meldingBijFout(e));
    } finally {
      this.bezig.set(false);
    }
  }

  async verwijder(docent: Docent) {
    if (!confirm(`Docent ${toonAfkorting(docent.afkorting)} (${docent.naam}) verwijderen?`)) return;

    this.melding.set(null);
    try {
      await this.dataService.deleteDocent(docent.afkorting);
      this.melding.set({ soort: 'ok', tekst: `Docent ${toonAfkorting(docent.afkorting)} is verwijderd.` });
    } catch (e) {
      this.melding.set(meldingBijFout(e));
    }
  }

  downloadSjabloon() {
    downloadCsv('docenten_sjabloon.csv', [
      ['afkorting', 'naam', 'email', 'actief'],
      ['vis', 'Hans Visser', 'visser@school.nl', 'ja'],
    ]);
  }

  downloadLijst() {
    downloadCsv('docenten.csv', [
      ['afkorting', 'naam', 'email', 'actief'],
      ...this.docenten().map(d => [d.afkorting, d.naam, d.email ?? '', d.actief ? 'ja' : 'nee']),
    ]);
  }

  importeer(gebeurtenis: Event) {
    const invoer = gebeurtenis.target as HTMLInputElement;
    const bestand = invoer.files?.[0];
    if (!bestand) return;

    const lezer = new FileReader();
    lezer.onload = async () => {
      invoer.value = '';
      await this.verwerkImport(String(lezer.result ?? ''));
    };
    lezer.readAsText(bestand);
  }

  /**
   * Leest afkorting, naam, e-mail en actief uit een CSV.
   *
   * Rijen met een afkorting die niet deugt worden overgeslagen en apart
   * gemeld, in plaats van de hele import af te breken: bij vijftig docenten wil
   * je niet dat één typefout de andere negenenveertig tegenhoudt.
   */
  async verwerkImport(tekst: string) {
    const rijen = parseCsv(tekst);
    if (rijen.length < 2) {
      this.melding.set({ soort: 'fout', tekst: 'Het bestand bevat geen regels onder de kopregel.' });
      return;
    }

    const koppen = rijen[0].map(k => k.trim().toLowerCase());
    const kolom = (naam: string) => koppen.indexOf(naam);
    const kAfkorting = kolom('afkorting');
    const kNaam = kolom('naam');
    const kEmail = kolom('email');
    const kActief = kolom('actief');

    if (kAfkorting === -1 || kNaam === -1) {
      this.melding.set({ soort: 'fout', tekst: 'De kopregel moet in elk geval de kolommen "afkorting" en "naam" bevatten.' });
      return;
    }

    const teSchrijven: Docent[] = [];
    const overgeslagen: string[] = [];

    for (const rij of rijen.slice(1)) {
      const afkorting = normaliseerAfkorting(rij[kAfkorting]);
      const naam = (rij[kNaam] ?? '').trim();
      // Alleen tegen de rijen uit dit bestand: een afkorting die al in de
      // database staat hoort te worden bijgewerkt, niet geweigerd. Twee rijen
      // met dezelfde afkorting is wel een fout -- dan is niet te zeggen welke
      // van de twee de bedoeling was.
      const fout = controleerAfkorting(afkorting, teSchrijven.map(d => d.afkorting));

      if (fout || naam === '') {
        const omschrijving = afkorting || naam || '(lege regel)';
        overgeslagen.push(`${omschrijving}: ${fout ? uitlegBijAfkortingFout(fout) : 'geen naam ingevuld'}`);
        continue;
      }

      const actiefTekst = (rij[kActief] ?? '').trim().toLowerCase();
      teSchrijven.push({
        afkorting,
        naam,
        email: kEmail === -1 ? undefined : (rij[kEmail] ?? '').trim() || undefined,
        actief: actiefTekst === '' ? true : ['ja', 'true', '1', 'actief'].includes(actiefTekst),
      });
    }

    this.bezig.set(true);
    let gelukt = 0;
    try {
      for (const docent of teSchrijven) {
        await this.dataService.saveDocent(docent);
        gelukt += 1;
      }
      const delen = [`${gelukt} ${gelukt === 1 ? 'docent' : 'docenten'} opgeslagen`];
      if (overgeslagen.length > 0) {
        delen.push(`${overgeslagen.length} overgeslagen:\n- ${overgeslagen.slice(0, 10).join('\n- ')}`);
        if (overgeslagen.length > 10) delen.push(`(en nog ${overgeslagen.length - 10})`);
      }
      this.melding.set({ soort: overgeslagen.length > 0 ? 'wacht' : 'ok', tekst: delen.join('. ') });
    } catch (e) {
      this.melding.set(meldingBijFout(e));
    } finally {
      this.bezig.set(false);
    }
  }
}
