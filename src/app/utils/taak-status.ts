/**
 * Bepaalt de voortgangsstatus van één leerling-vakcombinatie.
 *
 * De status stond eerder als veld op de taak en werd alleen bijgewerkt wanneer
 * een docent binnenkwam via de link uit zijn takenlijst. Vulde hij de memo op
 * een andere manier in, dan bleef de taak op "Open" staan terwijl de memo er
 * allang was. Daarom leiden we de status nu af: de memo is het bewijs dat het
 * gedaan is, de taak is alleen het verzoek.
 */

export type TaakStatus = 'niet-gevraagd' | 'open' | 'ingevuld' | 'spontaan';

export function bepaalStatus(heeftMemo: boolean, heeftTaak: boolean): TaakStatus {
  if (heeftMemo) return heeftTaak ? 'ingevuld' : 'spontaan';
  return heeftTaak ? 'open' : 'niet-gevraagd';
}

export const STATUS_LABEL: Record<TaakStatus, string> = {
  'niet-gevraagd': 'Niet gevraagd',
  'open': 'Openstaand',
  'ingevuld': 'Ingevuld',
  'spontaan': 'Nieuw, niet gevraagd'
};

/** Korte uitleg voor een tooltip, zodat de kleuren niet uitgelegd hoeven te worden. */
export const STATUS_UITLEG: Record<TaakStatus, string> = {
  'niet-gevraagd': 'Er is geen taak uitgezet en er is geen memo.',
  'open': 'Taak uitgezet, memo nog niet ingevuld.',
  'ingevuld': 'Memo ingevuld na een uitgezette taak.',
  'spontaan': 'Memo ingevuld zonder dat erom gevraagd was.'
};

/** Tailwind-klassen per status. Één plek, zodat bord en legenda niet uit elkaar lopen. */
export const STATUS_KLEUR: Record<TaakStatus, string> = {
  'niet-gevraagd': 'bg-slate-50 text-slate-400 border-slate-200',
  'open': 'bg-amber-50 text-amber-800 border-amber-200',
  'ingevuld': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'spontaan': 'bg-blue-50 text-blue-800 border-blue-200'
};

export const STATUS_ICOON: Record<TaakStatus, string> = {
  'niet-gevraagd': 'remove',
  'open': 'pending',
  'ingevuld': 'check_circle',
  'spontaan': 'fiber_new'
};

/**
 * Vergelijkt twee e-mailadressen zonder te struikelen over hoofdletters of
 * spaties. De docent logt in met het adres uit zijn toegangscode, terwijl de
 * taak het adres uit Docenten/Vakken draagt; één hoofdletter verschil liet
 * zijn takenlijst leeg zonder enige uitleg.
 */
export function zelfdeEmail(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Sleutel om memo's en taken op leerling en vak te kunnen opzoeken. */
export function vakSleutel(leerlingnummer: string, vak: string): string {
  return `${leerlingnummer.trim()}|${vak.trim().toLowerCase()}`;
}
