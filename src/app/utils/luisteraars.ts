/** Wat `onSnapshot` teruggeeft: een functie die het luisteren stopt. */
export type Stopper = () => void;

/**
 * Een bundel Firestore-luisteraars die je in zijn geheel aan- en uitzet.
 *
 * De luisteraars werden wel opgezet maar nooit opgeruimd. Dat gaf twee
 * problemen die allebei pas opvielen als iemand uitlogde zonder de pagina te
 * verversen:
 *
 * 1. Uitloggen verwijdert het sessiedocument. De luisteraars stonden op dat
 *    moment nog aan, kregen prompt 'permission-denied' en zetten de rode balk
 *    in beeld -- een foutmelding over iets wat de gebruiker zelf had gevraagd.
 * 2. Een luisteraar die is afgebroken komt niet vanzelf terug. Na opnieuw
 *    inloggen werd er dus niets meer opgehaald, en bleven de signals staan op
 *    de gegevens van de vórige gebruiker tot de pagina werd herladen.
 *
 * Deze klasse bevat alleen het aan-en-uitzetten, zonder Firestore, zodat dat
 * deel te testen is.
 */
export class Luisteraars {
  private stoppers: Stopper[] = [];

  /** Staan er luisteraars aan? */
  get actief(): boolean {
    return this.stoppers.length > 0;
  }

  get aantal(): number {
    return this.stoppers.length;
  }

  /**
   * Zet de luisteraars op. Doet niets als ze al aanstaan.
   *
   * Geeft terug of er daadwerkelijk is gestart, zodat de aanroeper weet of hij
   * een dubbele aanroep te pakken had.
   */
  start(maak: () => Stopper[]): boolean {
    if (this.actief) return false;
    this.stoppers = maak();
    return true;
  }

  /**
   * Stopt alles en geeft terug hoeveel er liepen.
   *
   * Een stopper die zelf een fout gooit mag de rest niet tegenhouden: dan zou
   * één kapotte luisteraar de andere zeven laten doorlopen, en precies die
   * blijven dan foutmeldingen produceren na het uitloggen.
   */
  stop(): number {
    const aantal = this.stoppers.length;
    for (const stopper of this.stoppers) {
      try {
        stopper();
      } catch (error) {
        console.warn('Luisteraar stoppen mislukte', error);
      }
    }
    this.stoppers = [];
    return aantal;
  }
}
