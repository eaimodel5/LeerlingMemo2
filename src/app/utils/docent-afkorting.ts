/**
 * De docentafkorting: hoe hij eruitziet, en wanneer hij deugt.
 *
 * Een docent wordt in de app tot nu toe herkend aan zijn e-mailadres. Dat is
 * een ongelukkige sleutel: adressen worden met de hand ingetypt, verschillen in
 * hoofdletters en spaties, veranderen bij een naamswijziging, en staan
 * inmiddels op vijf plekken los in de database. De school heeft al een unieke
 * aanduiding per docent -- de afkorting die ook op het rooster staat.
 *
 * Deze module bevat alleen de vorm en de controle. Het overzetten van bestaande
 * gegevens gebeurt later en met de hand: er wordt nergens uit een naam een
 * afkorting geraden.
 */

/** Zoals hij in de database staat: kleine letters, geen spaties. */
export function normaliseerAfkorting(invoer: string | null | undefined): string {
  return (invoer ?? '').trim().toLowerCase();
}

/** Zoals hij op het scherm staat: hoofdletters, want zo staat hij op het rooster. */
export function toonAfkorting(afkorting: string | null | undefined): string {
  return normaliseerAfkorting(afkorting).toUpperCase();
}

/** Zijn dit dezelfde docent? */
export function zelfdeAfkorting(a: string | null | undefined, b: string | null | undefined): boolean {
  const links = normaliseerAfkorting(a);
  const rechts = normaliseerAfkorting(b);
  return links !== '' && links === rechts;
}

export const AFKORTING_MIN = 2;
export const AFKORTING_MAX = 8;

export type AfkortingFout = 'leeg' | 'te-kort' | 'te-lang' | 'ongeldige-tekens' | 'bestaat-al';

const FOUT_TEKST: Record<AfkortingFout, string> = {
  leeg: 'Vul een afkorting in.',
  'te-kort': `Een afkorting is minstens ${AFKORTING_MIN} tekens lang.`,
  'te-lang': `Een afkorting is hoogstens ${AFKORTING_MAX} tekens lang.`,
  'ongeldige-tekens': 'Gebruik alleen letters en cijfers, zonder spaties of leestekens.',
  'bestaat-al': 'Deze afkorting is al in gebruik door een andere docent.',
};

export function uitlegBijAfkortingFout(fout: AfkortingFout): string {
  return FOUT_TEKST[fout];
}

/**
 * Alleen letters en cijfers.
 *
 * De afkorting wordt het document-ID in Firestore. Daar mogen geen slashes in,
 * en een punt of spatie levert bij het opzoeken subtiele ellende op. Strenger
 * dan Firestore eist, met opzet: dan hoeft niemand later te raden of `v.is` en
 * `vis` dezelfde docent zijn.
 */
const TOEGESTAAN = /^[a-z0-9]+$/;

/**
 * Controleert een ingetypte afkorting.
 *
 * `bestaande` zijn de afkortingen die al vergeven zijn; `eigen` is de afkorting
 * van de docent die je op dit moment bewerkt, zodat hij niet met zichzelf botst.
 */
export function controleerAfkorting(
  invoer: string | null | undefined,
  bestaande: readonly string[] = [],
  eigen?: string | null,
): AfkortingFout | null {
  const schoon = normaliseerAfkorting(invoer);

  if (schoon === '') return 'leeg';
  if (!TOEGESTAAN.test(schoon)) return 'ongeldige-tekens';
  if (schoon.length < AFKORTING_MIN) return 'te-kort';
  if (schoon.length > AFKORTING_MAX) return 'te-lang';

  const eigenSchoon = normaliseerAfkorting(eigen);
  const bezet = bestaande.map(normaliseerAfkorting).filter(a => a !== '' && a !== eigenSchoon);
  if (bezet.includes(schoon)) return 'bestaat-al';

  return null;
}

export function afkortingIsGeldig(
  invoer: string | null | undefined,
  bestaande: readonly string[] = [],
  eigen?: string | null,
): boolean {
  return controleerAfkorting(invoer, bestaande, eigen) === null;
}
