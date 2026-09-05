import { afkortingIsGeldig, normaliseerAfkorting, zelfdeAfkorting } from './docent-afkorting';
import { zelfdeEmail } from './taak-status';

/**
 * Entiteit die een docentidentiteit kan dragen (modern, legacy of gemengd).
 * Dit omvat AuthUser, AccessCode, DocentVak, DocentTaak, MemoTW1TW2, MemoTW3 en losse parameters.
 */
export interface DocentIdentiteitDrager {
  readonly docentAfkorting?: string | null;
  readonly docentEmail?: string | null;
  readonly email?: string | null;
  readonly ownerEmail?: string | null;
  readonly docentNaam?: string | null;
  readonly name?: string | null;
}

export type DocentIdentiteitSoort = 'afkorting' | 'email' | 'onbekend';

/**
 * Resultaat van de centrale identiteitsresolutie (PR 7).
 */
export interface OpgelosteDocentIdentiteit {
  /**
   * Soort primaire identiteit:
   * - 'afkorting': moderne identiteit (geldige docentAfkorting aanwezig)
   * - 'email': tijdelijke legacy identiteit (alleen e-mail aanwezig)
   * - 'onbekend': geen geldige afkorting en geen bruikbaar e-mailadres
   */
  readonly soort: DocentIdentiteitSoort;

  /**
   * Primaire opzoeksleutel voor vergelijkingen:
   * - Bij 'afkorting': genormaliseerde afkorting in kleine letters (bijv. 'vis')
   * - Bij 'email': genormaliseerd e-mailadres in kleine letters (bijv. 'visser@school.nl')
   * - Bij 'onbekend': null
   */
  readonly sleutel: string | null;

  /**
   * De genormaliseerde docentafkorting, UITSLUITEND wanneer deze expliciet aanwezig
   * en geldig is.
   *
   * **STRIKT**: Deze wordt NOOIT geraden uit naam of e-mailadres!
   */
  readonly docentAfkorting: string | null;

  /**
   * Het genormaliseerde e-mailadres als tijdelijke fallback voor vergelijkingen
   * met legacy data zolang backfill/migratie (PR 8/9) nog niet is voltooid.
   */
  readonly fallbackEmail: string | null;

  /**
   * Is dit een moderne identiteit met geldige docentafkorting?
   */
  readonly isModern: boolean;
}

/**
 * Haalt het e-mailadres op uit een drager (indien aanwezig).
 */
function haalEmailOp(drager: DocentIdentiteitDrager): string | null {
  const ruw = drager.docentEmail ?? drager.email ?? drager.ownerEmail;
  if (!ruw) return null;
  const getrimd = ruw.trim().toLowerCase();
  return getrimd.length > 0 ? getrimd : null;
}

/**
 * Centrale resolver voor docentidentiteiten.
 *
 * Ondersteunt:
 * 1. Moderne data: heeft een geldige docentAfkorting -> 'afkorting' (evt. met fallbackEmail).
 * 2. Legacy data: heeft GEEN docentAfkorting, wel een e-mailadres -> 'email'.
 * 3. Onvolledige data: heeft geen van beide -> 'onbekend'.
 *
 * **Regel**: raadt NOOIT een afkorting uit naam of e-mail.
 */
export function losDocentIdentiteitOp(
  invoer: DocentIdentiteitDrager | string | null | undefined
): OpgelosteDocentIdentiteit {
  if (!invoer) {
    return {
      soort: 'onbekend',
      sleutel: null,
      docentAfkorting: null,
      fallbackEmail: null,
      isModern: false,
    };
  }

  // String invoer (afkorting of e-mailadres direct meegegeven)
  if (typeof invoer === 'string') {
    const getrimd = invoer.trim();
    if (!getrimd) {
      return {
        soort: 'onbekend',
        sleutel: null,
        docentAfkorting: null,
        fallbackEmail: null,
        isModern: false,
      };
    }
    if (getrimd.includes('@')) {
      const email = getrimd.toLowerCase();
      return {
        soort: 'email',
        sleutel: email,
        docentAfkorting: null,
        fallbackEmail: email,
        isModern: false,
      };
    }
    if (afkortingIsGeldig(getrimd)) {
      const afk = normaliseerAfkorting(getrimd);
      return {
        soort: 'afkorting',
        sleutel: afk,
        docentAfkorting: afk,
        fallbackEmail: null,
        isModern: true,
      };
    }
    return {
      soort: 'onbekend',
      sleutel: null,
      docentAfkorting: null,
      fallbackEmail: null,
      isModern: false,
    };
  }

  // Object invoer (DocentIdentiteitDrager)
  const fallbackEmail = haalEmailOp(invoer);
  const ruweAfk = invoer.docentAfkorting?.trim();

  if (ruweAfk && afkortingIsGeldig(ruweAfk)) {
    const afk = normaliseerAfkorting(ruweAfk);
    return {
      soort: 'afkorting',
      sleutel: afk,
      docentAfkorting: afk,
      fallbackEmail,
      isModern: true,
    };
  }

  // Geen geldige docentAfkorting expliciet aanwezig:
  // We raden NOOIT een afkorting uit naam of e-mailadres!
  if (fallbackEmail) {
    return {
      soort: 'email',
      sleutel: fallbackEmail,
      docentAfkorting: null,
      fallbackEmail,
      isModern: false,
    };
  }

  return {
    soort: 'onbekend',
    sleutel: null,
    docentAfkorting: null,
    fallbackEmail: null,
    isModern: false,
  };
}

/**
 * Bepaalt of twee docentidentiteiten dezelfde docent aanduiden.
 *
 * Vergelijkingsregels:
 * 1. Beide modern (beide hebben een docentAfkorting):
 *    -> Vergelijking uitsluitend op basis van `zelfdeAfkorting`.
 *    -> E-mailadres wordt hier genegeerd; afkorting is leidend.
 * 2. Eén modern en één legacy (gemengde overgangssituatie):
 *    -> Tijdelijke fallback: indien beide een e-mailadres hebben,
 *       wordt vergeleken met `zelfdeEmail`.
 *    -> Heeft de moderne geen e-mailadres of de legacy geen e-mailadres,
 *       dan is er geen match (we raden NOOIT).
 * 3. Beide legacy (geen van beiden heeft docentAfkorting):
 *    -> Vergelijking op basis van `zelfdeEmail`.
 * 4. Bij 'onbekend' aan één of beide zijden: altijd `false`.
 */
export function komtDocentOvereen(
  a: DocentIdentiteitDrager | string | null | undefined,
  b: DocentIdentiteitDrager | string | null | undefined
): boolean {
  const idA = losDocentIdentiteitOp(a);
  const idB = losDocentIdentiteitOp(b);

  if (idA.soort === 'onbekend' || idB.soort === 'onbekend') {
    return false;
  }

  // Situatie 1: Beide hebben een docentAfkorting
  if (idA.docentAfkorting && idB.docentAfkorting) {
    return zelfdeAfkorting(idA.docentAfkorting, idB.docentAfkorting);
  }

  // Situatie 2 en 3: Ten minste één is legacy (geen docentAfkorting)
  // Gebruik e-mailadres als tijdelijke fallback waar beide over een adres beschikken.
  if (idA.fallbackEmail && idB.fallbackEmail) {
    return zelfdeEmail(idA.fallbackEmail, idB.fallbackEmail);
  }

  // Geen gemeenschappelijke vergelijkingsbasis mogelijk zonder gokken
  return false;
}

/**
 * Filtert een lijst van items op docentidentiteit.
 */
export function filterVoorDocent<T extends DocentIdentiteitDrager>(
  items: readonly T[],
  docent: DocentIdentiteitDrager | string | null | undefined
): T[] {
  if (!docent) return [];
  return items.filter(item => komtDocentOvereen(item, docent));
}

/**
 * Vindt het eerste item in een lijst behorend bij de opgegeven docent.
 */
export function vindVoorDocent<T extends DocentIdentiteitDrager>(
  items: readonly T[],
  docent: DocentIdentiteitDrager | string | null | undefined
): T | undefined {
  if (!docent) return undefined;
  return items.find(item => komtDocentOvereen(item, docent));
}

/**
 * Controleert of er ten minste één item in de lijst overeenkomt met de docent.
 */
export function heeftDocentKoppeling(
  items: readonly DocentIdentiteitDrager[],
  docent: DocentIdentiteitDrager | string | null | undefined
): boolean {
  if (!docent) return false;
  return items.some(item => komtDocentOvereen(item, docent));
}

/**
 * Bouwt veilige identiteitsvelden om op te slaan in een nieuw of bijgewerkt document
 * (DocentTaak, MemoTW1TW2, MemoTW3, DocentVak).
 *
 * Behoudt `docentEmail` altijd als legacy-compatibiliteit, en voegt `docentAfkorting`
 * toe indien bekend bij de bron.
 */
export function bouwDocentIdentiteitVelden(
  bron: DocentIdentiteitDrager | null | undefined,
  standaardEmail = ''
): { docentAfkorting?: string; docentEmail: string } {
  const opgelost = losDocentIdentiteitOp(bron);
  const email = opgelost.fallbackEmail || standaardEmail;
  const velden: { docentAfkorting?: string; docentEmail: string } = {
    docentEmail: email,
  };
  if (opgelost.docentAfkorting) {
    velden.docentAfkorting = opgelost.docentAfkorting;
  }
  return velden;
}
