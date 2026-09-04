import { AccessCode } from '../models/data.models';
import { Stopper } from './luisteraars';
import { sessieMoetStoppen } from './toegangscode';

export type CodeVelden = Pick<AccessCode, 'active' | 'used'>;

/** Wat de bewaking te horen krijgt als het codedocument verandert. */
export type CodeMelder = (bestaat: boolean, data?: CodeVelden | null) => void;

/** Zet het luisteren op en geeft terug hoe je ermee stopt. */
export type Abonneer = (melden: CodeMelder) => Stopper;

/**
 * Volgt tijdens een sessie het eigen codedocument, en niets anders.
 *
 * Firestore weigert een sessie al zodra de code erachter wordt ingetrokken --
 * dat deel is dicht. Maar de browser merkte dat pas doordat een luisteraar of
 * een volgende schrijfactie 'permission-denied' kreeg: schermen die leeg
 * bleven, een knop die niets deed. Wie zijn code kwijtraakt hoort gewoon
 * uitgelogd te worden.
 *
 * Bewust alleen het eigen document, niet de hele collectie /codes: die mag
 * volgens de regels alleen de beheerder doorzoeken, en een brede luisteraar
 * zou bij iedere andere rol meteen weigeren. Een gerichte `get` op het eigen
 * document past wél bij `allow get: if isAuthenticated()`.
 *
 * Het abonneren zit erbuiten, zodat de beslissing zonder Firebase te testen is.
 */
export class CodeBewaking {
  private stopper: Stopper | null = null;
  private alGemeld = false;

  /**
   * Welke ronde de huidige is.
   *
   * Een luisteraar uit een vorige sessie mag niet meer meepraten. Normaal
   * levert Firestore na `stop()` niets meer af, maar daar wil je niet van
   * afhangen: dan zou een late melding over de vórige code de nieuwe sessie
   * uitloggen.
   */
  private ronde = 0;

  get actief(): boolean {
    return this.stopper !== null;
  }

  /**
   * Begin het eigen codedocument te volgen.
   *
   * Een tweede aanroep vervangt de vorige bewaking — bij het herstellen van een
   * sessie na een herlading zou anders een luisteraar blijven hangen op de code
   * van de vorige inlog.
   */
  volg(abonneer: Abonneer, beeindig: () => void) {
    this.stop();
    this.alGemeld = false;
    this.ronde += 1;
    const dezeRonde = this.ronde;

    this.stopper = abonneer((bestaat, data) => {
      if (dezeRonde !== this.ronde) return;
      if (!sessieMoetStoppen(bestaat, data)) return;
      // Firestore kan hetzelfde nieuws twee keer brengen (bijvoorbeeld eerst
      // uit de cache, dan van de server). Eén keer uitloggen is genoeg.
      if (this.alGemeld) return;
      this.alGemeld = true;
      this.stop();
      beeindig();
    });
  }

  /** Stopt het volgen. Veilig om vaker aan te roepen. */
  stop() {
    if (!this.stopper) return;
    try {
      this.stopper();
    } catch (error) {
      console.warn('Codebewaking stoppen mislukte', error);
    }
    this.stopper = null;
  }
}
