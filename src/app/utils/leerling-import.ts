/**
 * Vertaalt een rij uit een geïmporteerd leerlingbestand naar de velden die de
 * app gebruikt.
 *
 * Staat apart van het beheerscherm zodat de kolomherkenning te testen is tegen
 * echte exportbestanden. Magister noemt de kolommen anders dan de app: de naam
 * staat verdeeld over Roepnaam, Tussenvoegsel en Achternaam, en de mentor heet
 * daar "Klassenmentor 1".
 */

export interface LeerlingRij {
  leerlingnummer: string;
  leerling: string;
  klas: string;
  mentorNaam: string;
  mentorEmail: string;
  actief: boolean;
}

/** Maakt kopteksten vergelijkbaar: zonder hoofdletters, spaties en BOM. */
export function normaliseerKoppen(koppen: string[]): string[] {
  return koppen.map(kop => kop.replace(/^﻿/, '').trim().toLowerCase().replace(/\s+/g, ''));
}

/** Zet een rij om naar een object met de genormaliseerde koptekst als sleutel. */
export function rijNaarObject(genormaliseerdeKoppen: string[], waarden: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  genormaliseerdeKoppen.forEach((kop, index) => { obj[kop] = waarden[index] ?? ''; });
  return obj;
}

/**
 * Leest één rij uit. Geeft lege strings terug voor wat niet in het bestand
 * staat; de aanroeper bepaalt wat een onbruikbare rij is.
 */
export function leesLeerlingRij(obj: Record<string, string>): LeerlingRij {
  const leerlingnummer = obj['leerlingnummer'] || obj['stamnummer'] || obj['nummer'] || '';

  // Een kant-en-klare naamkolom gaat voor; anders plakken we de losse delen
  // die Magister levert aan elkaar.
  const leerling = obj['leerling'] || obj['naam'] ||
    [obj['roepnaam'] || obj['voornaam'], obj['tussenvoegsel'], obj['achternaam']]
      .filter(deel => deel && deel.trim() !== '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

  const klas = obj['klas'] || obj['groep'] || '';

  // "Klassenmentor 1" is de naam die Magister gebruikt.
  const mentorNaam = obj['mentornaam'] || obj['mentor']
    || obj['klassenmentor1'] || obj['klassenmentor'] || obj['klassenmentor2'] || '';

  const mentorEmail = obj['mentoremail'] || obj['mentore-mail'] || obj['emailmentor'] || '';

  // Alles is actief, tenzij het bestand expliciet anders zegt.
  const actief = obj['actief'] !== 'false' && obj['actief'] !== '0' && obj['actief'] !== 'nee';

  return { leerlingnummer, leerling, klas, mentorNaam, mentorEmail, actief };
}
