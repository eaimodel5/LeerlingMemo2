/**
 * Biedt een bestand aan als download in de browser.
 *
 * Staat apart zodat de CSV-export en de tekstexport dezelfde afhandeling
 * gebruiken, inclusief het vrijgeven van de object-URL.
 */
export function downloadBestand(bestandsnaam: string, inhoud: string, mimeType = 'text/plain;charset=utf-8;'): void {
  const blob = new Blob([inhoud], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = bestandsnaam;
  link.click();
  // De object-URL vrijgeven, anders blijft het bestand in het geheugen staan.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Zet tekst op het klembord.
 *
 * De klembord-API van de browser werkt alleen op een beveiligde verbinding.
 * Draait de app op http — bijvoorbeeld lokaal tijdens het testen — dan is
 * `navigator.clipboard` niet beschikbaar. Zonder terugval faalde het kopiëren
 * daar stil: de knop deed niets en de gebruiker kreeg geen melding.
 *
 * Geeft terug of het gelukt is, zodat de aanroeper dat kan tonen.
 */
export async function naarKlembord(tekst: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(tekst);
      return true;
    }
  } catch {
    // Valt hieronder terug op de oudere methode.
  }

  try {
    const hulpveld = document.createElement('textarea');
    hulpveld.value = tekst;
    hulpveld.setAttribute('readonly', '');
    hulpveld.style.position = 'fixed';
    hulpveld.style.top = '-1000px';
    document.body.appendChild(hulpveld);
    hulpveld.select();
    const gelukt = document.execCommand('copy');
    document.body.removeChild(hulpveld);
    return gelukt;
  } catch {
    return false;
  }
}
