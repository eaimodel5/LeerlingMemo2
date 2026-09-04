/**
 * De zes aandachtspunten van een memo.
 *
 * Stonden als losse vinkjes in drie formulieren, als losse if-regels in de
 * Magister-export en nog eens los in het mentoroverzicht — vijf plekken die
 * uit elkaar konden lopen. Hier staan ze één keer.
 *
 * Bij blok 4 worden dit instellingen die de beheerder zelf beheert; deze lijst
 * is dan de standaardwaarde.
 */
export interface Aandachtspunt {
  /** Naam van het veld op de memo. */
  veld: string;
  label: string;
}

export const AANDACHTSPUNTEN: readonly Aandachtspunt[] = [
  { veld: 'aandachtInhoudelijkBegrip', label: 'Inhoudelijk begrip' },
  { veld: 'aandachtPlanningOrganisatie', label: 'Planning / organisatie' },
  { veld: 'aandachtToetsvoorbereidingLeerstrategie', label: 'Toetsvoorbereiding / leerstrategie' },
  { veld: 'aandachtInzetWerkhouding', label: 'Inzet / werkhouding' },
  { veld: 'aandachtWerkNietOpOrde', label: 'Werk niet op orde' },
  { veld: 'aandachtAanwezigheidVerzuim', label: 'Aanwezigheid / verzuim' }
];

/** De aangevinkte aandachtspunten van een memo, als labels. */
export function aandachtspuntenVan(memo: Record<string, unknown>): string[] {
  return AANDACHTSPUNTEN.filter(punt => memo[punt.veld] === true).map(punt => punt.label);
}
