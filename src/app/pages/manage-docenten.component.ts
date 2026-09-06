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
import { analyseerDocentMigratie } from '../utils/docent-migratie';

export type DocentMigratieDoel =
  | { collectie: 'docentVakken'; id: string }
  | { collectie: 'docentTaken'; id: string }
  | { collectie: 'memoTW1TW2'; id: string }
  | { collectie: 'memoTW3'; id: string };

/**
 * Een legacydocent uit bestaande records (Docenten/Vakken, DocentTaken, Memo's)
 * die nog niet expliciet aan een geldige docentafkorting gekoppeld is.
 *
 * legacyEmail wordt alleen gebruikt om bestaande legacyrecords van dezelfde
 * oude identiteit bij elkaar te tonen. Het adres wordt niet naar /docenten
 * gekopieerd.
 */
export interface OntbrekendeDocent {
  naam: string;
  legacyEmail: string;
  aantalKoppelingen: number;
  doelen: DocentMigratieDoel[];
  koppelingIds: string[];
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
          <button
            (click)="bestand.click()"
            class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
          >
            <mat-icon class="text-[16px] w-[16px] h-[16px]">upload_file</mat-icon>
            Importeer CSV
          </button>

          <input
            type="file"
            #bestand
            class="hidden"
            accept=".csv"
            (change)="importeer($event)"
          >

          <button
            (click)="downloadSjabloon()"
            class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
          >
            <mat-icon class="text-[16px] w-[16px] h-[16px]">download</mat-icon>
            Sjabloon
          </button>

          <button
            (click)="downloadLijst()"
            [disabled]="docenten().length === 0"
            class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <mat-icon class="text-[16px] w-[16px] h-[16px]">file_download</mat-icon>
            Exporteer
          </button>

          <button
            (click)="nieuw()"
            class="px-3 py-1.5 text-xs font-medium text-white bg-[#0d1e3a] hover:bg-[#1b3054] rounded-md shadow-sm transition-colors flex items-center gap-1.5"
          >
            <mat-icon class="text-[16px] w-[16px] h-[16px]">add</mat-icon>
            Nieuw
          </button>
        </div>
      </header>

      <div class="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        @if (melding(); as m) {
          <div
            class="p-3 rounded-lg text-xs flex items-start gap-2 border"
            [class.bg-emerald-50]="m.soort === 'ok'"
            [class.text-emerald-800]="m.soort === 'ok'"
            [class.border-emerald-200]="m.soort === 'ok'"
            [class.bg-amber-50]="m.soort === 'wacht'"
            [class.text-amber-800]="m.soort === 'wacht'"
            [class.border-amber-200]="m.soort === 'wacht'"
            [class.bg-red-50]="m.soort === 'fout'"
            [class.text-red-700]="m.soort === 'fout'"
            [class.border-red-200]="m.soort === 'fout'"
          >
            <mat-icon class="text-[16px] w-[16px] h-[16px] mt-0.5">
              {{ m.soort === 'fout' ? 'error' : 'info' }}
            </mat-icon>

            <span class="flex-1 whitespace-pre-line">
              {{ m.tekst }}
            </span>

            <button
              type="button"
              (click)="melding.set(null)"
              class="opacity-60 hover:opacity-100"
              title="Sluiten"
            >
              <mat-icon class="text-[16px] w-[16px] h-[16px]">close</mat-icon>
            </button>
          </div>
        }

        @if (migratieStatus(); as status) {
          <div
            class="bg-white rounded-xl border shadow-sm px-5 py-4"
            [class.border-emerald-200]="status.gereed"
            [class.border-amber-200]="!status.gereed"
          >
            <div class="flex items-start gap-3">
              <mat-icon
                class="text-[20px] w-[20px] h-[20px]"
                [class.text-emerald-600]="status.gereed"
                [class.text-amber-600]="!status.gereed"
              >
                {{ status.gereed ? 'check_circle' : 'warning' }}
              </mat-icon>

              <div class="min-w-0">
                <h3 class="text-sm font-bold text-slate-800">
                  Readiness docentafkortingen
                </h3>

                @if (status.gereed) {
                  <p class="text-xs text-emerald-700 mt-1">
                    Alle {{ status.totaalRecords }} koppelingen hebben een bekende docentafkorting.
                  </p>
                } @else {
                  <p class="text-xs text-amber-800 mt-1">
                    Nog niet gereed:
                    {{ status.zonderAfkorting }} zonder afkorting,
                    {{ status.onbekendeAfkorting }} met een onbekende afkorting
                    en {{ status.dubbeleAfkortingen.length }} dubbele afkortingen.
                  </p>

                  @if (status.dubbeleAfkortingen.length > 0) {
                    <p class="text-xs text-red-700 mt-2">
                      Dubbel:
                      <span class="font-mono">
                        {{ status.dubbeleAfkortingen.join(', ') }}
                      </span>
                    </p>
                  }
                }
              </div>
            </div>
          </div>
        }

        @if (zonderAfkorting().length > 0) {
          <div class="bg-white border border-amber-200 rounded-xl shadow-sm">
            <div class="px-5 py-4 border-b border-amber-100 bg-amber-50/60 rounded-t-xl">
              <h3 class="text-sm font-bold text-amber-900 flex items-center gap-2">
                <mat-icon class="text-[18px] w-[18px] h-[18px]">
                  link_off
                </mat-icon>

                {{ zonderAfkorting().length }}
                {{
                  zonderAfkorting().length === 1
                    ? 'docent nog niet goed gekoppeld'
                    : 'docenten nog niet goed gekoppeld'
                }}
              </h3>

              <p class="text-xs text-amber-800 mt-1 max-w-3xl">
                Kies zelf de juiste bestaande docent, of maak bewust een nieuwe
                docent met de schoolafkorting aan. Een gelijke naam wordt nooit
                automatisch als bewijs gebruikt.
              </p>
            </div>

            <div class="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              @for (
                ontbreekt of zonderAfkorting();
                track ontbreekt.legacyEmail ? ('email:' + ontbreekt.legacyEmail) : (ontbreekt.doelen[0]?.collectie + ':' + ontbreekt.doelen[0]?.id)
              ) {
                <div class="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-800 truncate">
                      {{ ontbreekt.naam || 'Naam onbekend' }}
                    </div>

                    <div class="text-xs text-slate-500 truncate">
                      {{ ontbreekt.legacyEmail || 'geen legacyadres' }}
                      ·
                      {{ ontbreekt.aantalKoppelingen }}
                      {{
                        ontbreekt.aantalKoppelingen === 1
                          ? 'record'
                          : 'records'
                      }}
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2 shrink-0">
                    <button
                      type="button"
                      (click)="koppelBestaande(ontbreekt)"
                      [disabled]="ontbreekt.doelen.length === 0"
                      class="px-2.5 py-1 text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded transition-colors disabled:opacity-40"
                    >
                      Koppel bestaande
                    </button>

                    <button
                      type="button"
                      (click)="nieuwVoor(ontbreekt)"
                      [disabled]="ontbreekt.doelen.length === 0"
                      class="px-2.5 py-1 text-xs font-medium text-amber-800 bg-white hover:bg-amber-50 border border-amber-300 rounded transition-colors disabled:opacity-40"
                    >
                      Nieuwe docent
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
          <input
            [ngModel]="zoek()"
            (ngModelChange)="zoek.set($event)"
            placeholder="Zoek op afkorting of naam..."
            class="flex-1 min-w-[220px] px-3 py-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >

          <label class="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              [ngModel]="toonInactief()"
              (ngModelChange)="toonInactief.set($event)"
              class="rounded border-slate-300"
            >
            Ook niet-actieve docenten
          </label>

          <span class="text-xs text-slate-500">
            {{ zichtbaar().length }} van {{ docenten().length }}
          </span>
        </div>

        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th class="px-6 py-3">Afkorting</th>
                <th class="px-6 py-3">Naam</th>
                <th class="px-6 py-3">Status</th>
                <th class="px-6 py-3 text-right">Acties</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100">
              @for (docent of zichtbaar(); track docent.afkorting) {
                <tr
                  class="hover:bg-slate-50 transition-colors"
                  [class.opacity-60]="!docent.actief"
                >
                  <td class="px-6 py-3 font-mono font-bold text-[#e87700]">
                    {{ toon(docent.afkorting) }}
                  </td>

                  <td class="px-6 py-3 font-semibold text-slate-800">
                    {{ docent.naam }}
                  </td>

                  <td class="px-6 py-3">
                    @if (docent.actief) {
                      <span class="px-2 py-1 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Actief
                      </span>
                    } @else {
                      <span class="px-2 py-1 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                        Niet actief
                      </span>
                    }
                  </td>

                  <td class="px-6 py-3 text-right whitespace-nowrap">
                    <button
                      (click)="bewerk(docent)"
                      class="text-blue-600 hover:text-blue-800 mx-1"
                      title="Bewerken"
                    >
                      <mat-icon class="text-[18px] w-[18px] h-[18px]">
                        edit
                      </mat-icon>
                    </button>

                    @if (magVerwijderen()) {
                      <button
                        (click)="verwijder(docent)"
                        class="text-red-500 hover:text-red-700 mx-1"
                        title="Verwijderen"
                      >
                        <mat-icon class="text-[18px] w-[18px] h-[18px]">
                          delete
                        </mat-icon>
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-6 py-16 text-center text-slate-400 italic">
                    @if (docenten().length === 0) {
                      Nog geen docenten. Voeg ze los toe, of importeer een CSV
                      met afkorting en naam.
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

      @if (formulier(); as f) {
        <div class="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 class="text-base font-bold text-slate-800 mb-1">
              {{ f.bestaand ? 'Docent bewerken' : 'Nieuwe docent' }}
            </h3>

            @if (f.doelen.length > 0) {
              <p class="text-xs text-amber-700 mb-4">
                Na opslaan worden
                {{ f.doelen.length }}
                {{
                  f.doelen.length === 1
                    ? 'gekozen legacyrecord'
                    : 'gekozen legacyrecords'
                }}
                expliciet aan deze nieuwe docent gekoppeld.
              </p>
            } @else {
              <p class="text-xs text-slate-500 mb-4">
                De afkorting is de sleutel; die van de school is leidend.
              </p>
            }

            <label
              class="block text-xs font-bold text-slate-500 uppercase mb-1"
              for="veld-afkorting"
            >
              Afkorting
            </label>

            <input
              id="veld-afkorting"
              [ngModel]="f.afkorting"
              (ngModelChange)="zetVeld('afkorting', $event)"
              [disabled]="f.bestaand"
              placeholder="vis"
              class="w-full px-3 py-2 mb-1 text-sm font-mono uppercase border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
            >

            @if (f.bestaand) {
              <p class="text-[11px] text-slate-400 mb-3">
                De afkorting is het kenmerk van deze docent en kan niet worden
                gewijzigd. Klopt hij niet, verwijder de docent en maak een
                nieuwe aan.
              </p>
            } @else if (afkortingFout(); as fout) {
              <p class="text-[11px] text-red-600 mb-3">
                {{ uitleg(fout) }}
              </p>
            } @else {
              <p class="text-[11px] text-slate-400 mb-3">
                Wordt opgeslagen als
                <span class="font-mono">{{ genormaliseerd() }}</span>.
              </p>
            }

            <label
              class="block text-xs font-bold text-slate-500 uppercase mb-1"
              for="veld-naam"
            >
              Naam
            </label>

            <input
              id="veld-naam"
              [ngModel]="f.naam"
              (ngModelChange)="zetVeld('naam', $event)"
              placeholder="Hans Visser"
              class="w-full px-3 py-2 mb-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            >

            <label class="flex items-center gap-2 text-sm text-slate-700 mb-5">
              <input
                type="checkbox"
                [ngModel]="f.actief"
                (ngModelChange)="zetVeld('actief', $event)"
                class="rounded border-slate-300"
              >
              Actief
            </label>

            <div class="flex justify-end gap-2">
              <button
                (click)="formulier.set(null)"
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Annuleren
              </button>

              <button
                (click)="bewaar()"
                [disabled]="!kanBewaren() || bezig()"
                class="px-4 py-2 text-sm font-medium text-white bg-[#0d1e3a] hover:bg-[#1b3054] rounded-md disabled:opacity-50"
              >
                Opslaan
              </button>
            </div>
          </div>
        </div>
      }

      @if (koppelingFormulier(); as k) {
        <div class="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 class="text-base font-bold text-slate-800 mb-1">
              Koppel aan bestaande docent
            </h3>

            <p class="text-xs text-slate-500 mb-4">
              Kies zelf welke docent bij
              <strong>{{ k.ontbreekt.naam || 'deze legacykoppeling' }}</strong>
              hoort. Er wordt niets automatisch gekozen op basis van naam.
            </p>

            <label
              for="koppel-afkorting"
              class="block text-xs font-bold text-slate-500 uppercase mb-1"
            >
              Docent
            </label>

            <select
              id="koppel-afkorting"
              [ngModel]="k.docentAfkorting"
              (ngModelChange)="zetKoppelingAfkorting($event)"
              class="w-full px-3 py-2 mb-3 text-sm border border-slate-300 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">
                Kies een docent...
              </option>

              @for (docent of docenten(); track docent.afkorting) {
                <option [value]="docent.afkorting">
                  {{ toon(docent.afkorting) }} · {{ docent.naam }}
                  {{ docent.actief ? '' : ' · niet actief' }}
                </option>
              }
            </select>

            <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-5 text-xs text-slate-600">
              <div>
                <strong>Legacynaam:</strong>
                {{ k.ontbreekt.naam || 'onbekend' }}
              </div>

              <div class="mt-1">
                <strong>Aantal records:</strong>
                {{ k.ontbreekt.doelen.length }}
              </div>
            </div>

            <div class="flex justify-end gap-2">
              <button
                type="button"
                (click)="koppelingFormulier.set(null)"
                class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md"
              >
                Annuleren
              </button>

              <button
                type="button"
                (click)="bewaarKoppeling()"
                [disabled]="!kanKoppelen() || bezig()"
                class="px-4 py-2 text-sm font-medium text-white bg-[#0d1e3a] hover:bg-[#1b3054] rounded-md disabled:opacity-50"
              >
                Koppelen
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

  formulier = signal<{
    afkorting: string;
    naam: string;
    actief: boolean;
    bestaand: boolean;
    koppelingIds: string[];
    doelen: DocentMigratieDoel[];
  } | null>(null);

  koppelingFormulier = signal<{
    ontbreekt: OntbrekendeDocent;
    docentAfkorting: string;
  } | null>(null);

  magVerwijderen = computed(() =>
    this.authService.mag('leerlingenVerwijderen'),
  );

  docenten = computed(() =>
    [...this.dataService.docenten()].sort((a, b) =>
      a.afkorting.localeCompare(b.afkorting, 'nl'),
    ),
  );

  migratieStatus = computed(() =>
    analyseerDocentMigratie(
      this.dataService.docenten(),
      [
        {
          naam: 'Docenten/Vakken',
          records: this.dataService.docentVakken().map(
            (koppeling, index) => ({
              id:
                koppeling.id ??
                `docentVak:${index}`,
              docentAfkorting:
                koppeling.docentAfkorting,
            }),
          ),
        },
        {
          naam: 'DocentTaken',
          records: this.dataService.docentTaken().map(
            (taak, index) => ({
              id:
                taak.id ??
                `docentTaak:${index}`,
              docentAfkorting:
                taak.docentAfkorting,
            }),
          ),
        },
        {
          naam: 'Memo TW1/TW2',
          records: this.dataService.memoTW1TW2().map(
            (memo, index) => ({
              id:
                memo.id ??
                `memoTW1TW2:${index}`,
              docentAfkorting:
                memo.docentAfkorting,
            }),
          ),
        },
        {
          naam: 'Memo TW3',
          records: this.dataService.memoTW3().map(
            (memo, index) => ({
              id:
                memo.id ??
                `memoTW3:${index}`,
              docentAfkorting:
                memo.docentAfkorting,
            }),
          ),
        },
      ],
    ),
  );

  zichtbaar = computed(() => {
    const term = this.zoek().trim().toLowerCase();

    return this.docenten().filter(d => {
      if (!this.toonInactief() && !d.actief) return false;
      if (!term) return true;

      return (
        d.afkorting.includes(term) ||
        d.naam.toLowerCase().includes(term)
      );
    });
  });

  /**
   * Identificeert docenten uit de vier datasets (Docenten/Vakken, DocentTaken,
   * Memo TW1/TW2 en Memo TW3) die nog niet naar een geldige /docenten-afkorting
   * wijzen.
   *
   * Een gelijke naam telt niet als koppeling.
   */
  zonderAfkorting = computed<OntbrekendeDocent[]>(() => {
    const bekend = this.dataService.docenten();
    const perDocent = new Map<string, OntbrekendeDocent>();
    let uniekeSleutelTeller = 0;

    const verwerk = (
      collectie: DocentMigratieDoel['collectie'],
      records: readonly {
        id?: string;
        docentNaam?: string;
        docentEmail?: string;
        docentAfkorting?: string;
      }[],
    ) => {
      for (const record of records) {
        if (
          record.docentAfkorting &&
          bekend.some(d =>
            zelfdeAfkorting(
              d.afkorting,
              record.docentAfkorting,
            ),
          )
        ) {
          continue;
        }

        const email = (record.docentEmail ?? '').trim();
        const naam = (record.docentNaam ?? '').trim();

        if (!naam && !email && !record.id) {
          continue;
        }

        /*
         * Alleen legacy-e-mail wordt gebruikt om bestaande oude records voor
         * dezelfde beheerhandeling te groeperen. Records zonder legacy-e-mail
         * mogen niet op naam worden samengevoegd: die blijven ieder apart.
         *
         * Dit bepaalt NIET welke nieuwe docent erbij hoort. Die keuze maakt de
         * beheerder daarna zelf.
         */
        const sleutel = email
          ? `email:${email.toLowerCase()}`
          : `zonder-email:${collectie}:${record.id ?? ++uniekeSleutelTeller}`;

        const bestaand = perDocent.get(sleutel) ?? {
          naam:
            naam ||
            (record.docentAfkorting
              ? `Afkorting: ${record.docentAfkorting}`
              : 'Naam onbekend'),
          legacyEmail: email,
          aantalKoppelingen: 0,
          doelen: [],
          koppelingIds: [],
        };

        if (
          (!bestaand.naam || bestaand.naam === 'Naam onbekend') &&
          naam
        ) {
          bestaand.naam = naam;
        }

        if (
          record.id &&
          !bestaand.doelen.some(
            d => d.collectie === collectie && d.id === record.id,
          )
        ) {
          bestaand.doelen.push({ collectie, id: record.id });
          bestaand.koppelingIds.push(record.id);
        }

        bestaand.aantalKoppelingen = bestaand.doelen.length;

        perDocent.set(sleutel, bestaand);
      }
    };

    verwerk('docentVakken', this.dataService.docentVakken());
    verwerk('docentTaken', this.dataService.docentTaken());
    verwerk('memoTW1TW2', this.dataService.memoTW1TW2());
    verwerk('memoTW3', this.dataService.memoTW3());

    return [...perDocent.values()].sort((a, b) =>
      a.naam.localeCompare(b.naam, 'nl'),
    );
  });

  genormaliseerd = computed(() =>
    normaliseerAfkorting(
      this.formulier()?.afkorting,
    ),
  );

  afkortingFout = computed<AfkortingFout | null>(() => {
    const f = this.formulier();

    if (!f || f.bestaand) {
      return null;
    }

    return controleerAfkorting(
      f.afkorting,
      this.docenten().map(d => d.afkorting),
    );
  });

  kanBewaren = computed(() => {
    const f = this.formulier();

    if (!f) {
      return false;
    }

    return (
      this.afkortingFout() === null &&
      f.naam.trim() !== ''
    );
  });

  kanKoppelen = computed(() => {
    const f = this.koppelingFormulier();

    if (!f || f.ontbreekt.doelen.length === 0) {
      return false;
    }

    const afkorting =
      normaliseerAfkorting(f.docentAfkorting);

    return this.docenten().some(d =>
      zelfdeAfkorting(d.afkorting, afkorting),
    );
  });

  toon(afkorting: string) {
    return toonAfkorting(afkorting);
  }

  uitleg(fout: AfkortingFout) {
    return uitlegBijAfkortingFout(fout);
  }

  zetVeld(
    veld: 'afkorting' | 'naam' | 'actief',
    waarde: string | boolean,
  ) {
    const f = this.formulier();

    if (!f) {
      return;
    }

    this.formulier.set({
      ...f,
      [veld]: waarde,
    });
  }

  zetKoppelingAfkorting(waarde: string) {
    const f = this.koppelingFormulier();

    if (!f) {
      return;
    }

    this.koppelingFormulier.set({
      ...f,
      docentAfkorting:
        normaliseerAfkorting(waarde),
    });
  }

  nieuw() {
    this.koppelingFormulier.set(null);

    this.formulier.set({
      afkorting: '',
      naam: '',
      actief: true,
      bestaand: false,
      koppelingIds: [],
      doelen: [],
    });
  }

  /**
   * De beheerder heeft expliciet gekozen dat deze legacyrecords bij een
   * nieuw aan te maken docent horen.
   *
   * Naam wordt alleen voorgevuld voor gemak. De afkorting blijft leeg en moet
   * door de beheerder zelf worden ingevuld.
   */
  nieuwVoor(ontbreekt: OntbrekendeDocent) {
    this.koppelingFormulier.set(null);

    this.formulier.set({
      afkorting: '',
      naam: ontbreekt.naam === 'Naam onbekend' ? '' : ontbreekt.naam,
      actief: true,
      bestaand: false,
      koppelingIds: [...ontbreekt.koppelingIds],
      doelen: [...ontbreekt.doelen],
    });
  }

  /**
   * Opent een expliciete keuze uit bestaande /docenten-records.
   */
  koppelBestaande(ontbreekt: OntbrekendeDocent) {
    if (ontbreekt.doelen.length === 0) {
      this.melding.set({
        soort: 'fout',
        tekst:
          'Deze koppeling heeft geen document-ID en kan daarom niet veilig worden bijgewerkt.',
      });
      return;
    }

    this.formulier.set(null);

    this.koppelingFormulier.set({
      ontbreekt,
      docentAfkorting: '',
    });
  }

  bewerk(docent: Docent) {
    this.koppelingFormulier.set(null);

    this.formulier.set({
      afkorting: docent.afkorting,
      naam: docent.naam,
      actief: docent.actief,
      bestaand: true,
      koppelingIds: [],
      doelen: [],
    });
  }

  private async schrijfDocentAfkortingNaarDoelen(
    doelen: readonly DocentMigratieDoel[],
    docentAfkorting: string,
  ) {
    const afkorting =
      normaliseerAfkorting(docentAfkorting);

    for (const doel of doelen) {
      switch (doel.collectie) {
        case 'docentVakken':
          await this.dataService.updateDocentVak(doel.id, {
            docentAfkorting: afkorting,
          });
          break;
        case 'docentTaken':
          await this.dataService.updateDocentTaak(doel.id, {
            docentAfkorting: afkorting,
          });
          break;
        case 'memoTW1TW2':
          await this.dataService.updateMemoTW1TW2(doel.id, {
            docentAfkorting: afkorting,
          });
          break;
        case 'memoTW3':
          await this.dataService.updateMemoTW3(doel.id, {
            docentAfkorting: afkorting,
          });
          break;
      }
    }
  }

  private async schrijfDocentAfkortingNaarKoppelingen(
    koppelingIds: readonly string[],
    docentAfkorting: string,
  ) {
    const doelen: DocentMigratieDoel[] = koppelingIds.map(id => ({
      collectie: 'docentVakken',
      id,
    }));
    await this.schrijfDocentAfkortingNaarDoelen(doelen, docentAfkorting);
  }

  async bewaarKoppeling() {
    const f = this.koppelingFormulier();

    if (!f || !this.kanKoppelen()) {
      return;
    }

    const afkorting =
      normaliseerAfkorting(f.docentAfkorting);

    this.bezig.set(true);
    this.melding.set(null);

    try {
      await this.schrijfDocentAfkortingNaarDoelen(
        f.ontbreekt.doelen,
        afkorting,
      );

      const aantal =
        f.ontbreekt.doelen.length;

      this.melding.set({
        soort: 'ok',
        tekst:
          `${aantal} ${
            aantal === 1
              ? 'record is'
              : 'records zijn'
          } gekoppeld aan ${toonAfkorting(afkorting)}.`,
      });

      this.koppelingFormulier.set(null);
    } catch (e) {
      const fout = meldingBijFout(e);
      this.melding.set({
        soort: 'fout',
        tekst:
          `Niet alle records konden worden bijgewerkt. Een deel is mogelijk al gekoppeld.\n` +
          fout.tekst,
      });
    } finally {
      this.bezig.set(false);
    }
  }

  async bewaar() {
    const f = this.formulier();

    if (!f || !this.kanBewaren()) {
      return;
    }

    this.bezig.set(true);
    this.melding.set(null);

    const afkorting =
      normaliseerAfkorting(f.afkorting);

    let docentOpgeslagen = false;

    try {
      const bestaand = this.docenten().find(d =>
        zelfdeAfkorting(
          d.afkorting,
          afkorting,
        ),
      );

      await this.dataService.saveDocent({
        afkorting,
        naam: f.naam.trim(),
        actief: f.actief,
        aangemaaktOp: bestaand?.aangemaaktOp,
      });

      docentOpgeslagen = true;

      const doelen = f.doelen ?? [];

      if (doelen.length > 0) {
        await this.schrijfDocentAfkortingNaarDoelen(
          doelen,
          afkorting,
        );

        const aantal = doelen.length;

        this.melding.set({
          soort: 'ok',
          tekst:
            `Docent ${toonAfkorting(afkorting)} is opgeslagen en ` +
            `${aantal} ${
              aantal === 1
                ? 'legacyrecord is'
                : 'legacyrecords zijn'
            } gekoppeld.`,
        });
      } else {
        this.melding.set(
          MELDING_BEVESTIGD(
            `Docent ${toonAfkorting(afkorting)}`,
          ),
        );
      }

      this.formulier.set(null);
    } catch (e) {
      if (
        docentOpgeslagen &&
        (f.doelen?.length ?? 0) > 0
      ) {
        const fout = meldingBijFout(e);

        this.formulier.set(null);

        this.melding.set({
          soort: 'fout',
          tekst:
            `Docent ${toonAfkorting(afkorting)} is wel opgeslagen, ` +
            `maar het koppelen van de legacygegevens is niet (volledig) gelukt. ` +
            `Een deel is mogelijk al gekoppeld. Gebruik daarna "Koppel bestaande" om het opnieuw te proberen.\n` +
            fout.tekst,
        });
      } else {
        this.melding.set(meldingBijFout(e));
      }
    } finally {
      this.bezig.set(false);
    }
  }

  async verwijder(docent: Docent) {
    if (
      !confirm(
        `Docent ${toonAfkorting(docent.afkorting)} (${docent.naam}) verwijderen?`,
      )
    ) {
      return;
    }

    this.melding.set(null);

    try {
      await this.dataService.deleteDocent(
        docent.afkorting,
      );

      this.melding.set({
        soort: 'ok',
        tekst:
          `Docent ${toonAfkorting(docent.afkorting)} is verwijderd.`,
      });
    } catch (e) {
      this.melding.set(meldingBijFout(e));
    }
  }

  downloadSjabloon() {
    downloadCsv(
      'docenten_sjabloon.csv',
      [
        ['afkorting', 'naam', 'actief'],
        ['vis', 'Hans Visser', 'ja'],
      ],
    );
  }

  downloadLijst() {
    downloadCsv(
      'docenten.csv',
      [
        ['afkorting', 'naam', 'actief'],
        ...this.docenten().map(d => [
          d.afkorting,
          d.naam,
          d.actief ? 'ja' : 'nee',
        ]),
      ],
    );
  }

  importeer(gebeurtenis: Event) {
    const invoer =
      gebeurtenis.target as HTMLInputElement;

    const bestand =
      invoer.files?.[0];

    if (!bestand) {
      return;
    }

    const lezer = new FileReader();

    lezer.onload = async () => {
      invoer.value = '';

      await this.verwerkImport(
        String(lezer.result ?? ''),
      );
    };

    lezer.readAsText(bestand);
  }

  /**
   * Leest alleen afkorting, naam en actief.
   *
   * Een eventuele oude e-mailkolom wordt genegeerd.
   */
  async verwerkImport(tekst: string) {
    const rijen = parseCsv(tekst);

    if (rijen.length < 2) {
      this.melding.set({
        soort: 'fout',
        tekst:
          'Het bestand bevat geen regels onder de kopregel.',
      });
      return;
    }

    const koppen =
      rijen[0].map(k =>
        k.trim().toLowerCase(),
      );

    const kolom = (naam: string) =>
      koppen.indexOf(naam);

    const kAfkorting =
      kolom('afkorting');

    const kNaam =
      kolom('naam');

    const kActief =
      kolom('actief');

    if (
      kAfkorting === -1 ||
      kNaam === -1
    ) {
      this.melding.set({
        soort: 'fout',
        tekst:
          'De kopregel moet in elk geval de kolommen "afkorting" en "naam" bevatten.',
      });
      return;
    }

    const teSchrijven: Docent[] = [];
    const overgeslagen: string[] = [];

    for (const rij of rijen.slice(1)) {
      const afkorting =
        normaliseerAfkorting(
          rij[kAfkorting],
        );

      const naam =
        (rij[kNaam] ?? '').trim();

      const fout =
        controleerAfkorting(
          afkorting,
          teSchrijven.map(
            d => d.afkorting,
          ),
        );

      if (fout || naam === '') {
        const omschrijving =
          afkorting ||
          naam ||
          '(lege regel)';

        overgeslagen.push(
          `${omschrijving}: ${
            fout
              ? uitlegBijAfkortingFout(fout)
              : 'geen naam ingevuld'
          }`,
        );

        continue;
      }

      const actiefTekst =
        (rij[kActief] ?? '')
          .trim()
          .toLowerCase();

      /*
       * Een eventuele kolom email wordt bewust niet gelezen.
       */
      teSchrijven.push({
        afkorting,
        naam,
        actief:
          actiefTekst === ''
            ? true
            : [
                'ja',
                'true',
                '1',
                'actief',
              ].includes(actiefTekst),
      });
    }

    this.bezig.set(true);

    let gelukt = 0;

    try {
      for (const docent of teSchrijven) {
        await this.dataService.saveDocent(docent);
        gelukt += 1;
      }

      const delen = [
        `${gelukt} ${
          gelukt === 1
            ? 'docent'
            : 'docenten'
        } opgeslagen`,
      ];

      if (overgeslagen.length > 0) {
        delen.push(
          `${overgeslagen.length} overgeslagen:\n- ${overgeslagen
            .slice(0, 10)
            .join('\n- ')}`,
        );

        if (overgeslagen.length > 10) {
          delen.push(
            `(en nog ${
              overgeslagen.length - 10
            })`,
          );
        }
      }

      this.melding.set({
        soort:
          overgeslagen.length > 0
            ? 'wacht'
            : 'ok',
        tekst: delen.join('. '),
      });
    } catch (e) {
      this.melding.set(
        meldingBijFout(e),
      );
    } finally {
      this.bezig.set(false);
    }
  }
}
