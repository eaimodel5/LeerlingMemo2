/**
 * Afhandeling van een schrijfactie naar Firestore.
 *
 * Firestore gedraagt zich hier anders dan je zou verwachten. Zonder verbinding
 * mislukt een schrijfactie niet: de SDK zet hem lokaal klaar en de belofte
 * blijft openstaan tot de server hem bevestigt — desnoods minutenlang. Wachten
 * we daar zonder meer op, dan blijft de opslaanknop hangen zonder uitleg.
 * Melden we niets en gaan we door, dan krijgt de gebruiker "opgeslagen" te zien
 * terwijl er niets is verstuurd. Beide zijn we net kwijtgeraakt.
 *
 * Daarom drie uitkomsten in plaats van twee.
 */
export type OpslagUitkomst =
  /** De server heeft de wijziging bevestigd. */
  | 'bevestigd'
  /** Lokaal aangenomen, nog niet bevestigd — vrijwel altijd een haperende verbinding. */
  | 'wacht-op-verbinding';

/**
 * Wacht op de bevestiging van de server, maar niet langer dan `tijdslimietMs`.
 * Een fout van Firestore wordt gewoon doorgegeven aan de aanroeper.
 */
export async function wachtOpOpslag(belofte: Promise<unknown>, tijdslimietMs = 8000): Promise<OpslagUitkomst> {
  // Zonder deze extra handler wordt een fout die ná de tijdslimiet binnenkomt
  // een onafgevangen belofte in de console.
  belofte.catch(() => { /* de race hieronder meldt hem al, of hij komt te laat */ });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const tijdslimiet = new Promise<OpslagUitkomst>(klaar => {
    timer = setTimeout(() => klaar('wacht-op-verbinding'), tijdslimietMs);
  });

  try {
    return await Promise.race([
      belofte.then((): OpslagUitkomst => 'bevestigd'),
      tijdslimiet
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Wat er in beeld komt na een opslagpoging. */
export interface Melding {
  soort: 'ok' | 'wacht' | 'fout';
  tekst: string;
}

export const MELDING_BEVESTIGD = (wat: string): Melding => ({
  soort: 'ok',
  tekst: `${wat} is opgeslagen.`
});

export const MELDING_WACHT: Melding = {
  soort: 'wacht',
  tekst: 'Je invoer is aangenomen maar nog niet bevestigd door de server. Waarschijnlijk hapert de verbinding. Laat dit scherm openstaan tot de bevestiging binnen is, en controleer daarna of je wijziging er echt staat.'
};

export const meldingBijFout = (e: unknown): Melding => ({
  soort: 'fout',
  tekst: e instanceof Error ? e.message : 'Opslaan is niet gelukt. Je invoer staat nog in het formulier; probeer het opnieuw.'
});
