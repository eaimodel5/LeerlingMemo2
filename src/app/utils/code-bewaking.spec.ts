import { describe, it, expect, vi } from 'vitest';
import { CodeBewaking, CodeMelder } from './code-bewaking';

/**
 * Een nagebootst abonnement op het eigen codedocument.
 *
 * `meld(...)` speelt na wat Firestore zou doorgeven; `stop` laat zien of de
 * bewaking het luisteren netjes heeft beëindigd.
 */
function nepAbonnement() {
  let melder: CodeMelder | null = null;
  const stop = vi.fn();
  return {
    stop,
    abonneer: (m: CodeMelder) => {
      melder = m;
      return stop;
    },
    meld: (bestaat: boolean, data?: { active?: boolean; used?: boolean }) => melder?.(bestaat, data),
  };
}

describe('CodeBewaking', () => {
  it('begint uit', () => {
    expect(new CodeBewaking().actief).toBe(false);
  });

  it('staat aan zodra je volgt', () => {
    const bewaking = new CodeBewaking();
    bewaking.volg(nepAbonnement().abonneer, vi.fn());
    expect(bewaking.actief).toBe(true);
  });

  it('laat een actieve code met rust', () => {
    const bewaking = new CodeBewaking();
    const abonnement = nepAbonnement();
    const beeindig = vi.fn();

    bewaking.volg(abonnement.abonneer, beeindig);
    abonnement.meld(true, { active: true, used: false });
    abonnement.meld(true, { active: true, used: false });

    expect(beeindig).not.toHaveBeenCalled();
    expect(bewaking.actief).toBe(true);
  });

  it('laat een code zonder het veld active met rust', () => {
    // Codes van voor de intrekfunctie hebben dat veld niet en horen gewoon te
    // blijven werken.
    const bewaking = new CodeBewaking();
    const abonnement = nepAbonnement();
    const beeindig = vi.fn();

    bewaking.volg(abonnement.abonneer, beeindig);
    abonnement.meld(true, {});

    expect(beeindig).not.toHaveBeenCalled();
  });

  it('beëindigt de sessie bij een ingetrokken code', () => {
    const bewaking = new CodeBewaking();
    const abonnement = nepAbonnement();
    const beeindig = vi.fn();

    bewaking.volg(abonnement.abonneer, beeindig);
    abonnement.meld(true, { active: false });

    expect(beeindig).toHaveBeenCalledOnce();
  });

  it('beëindigt de sessie bij een legacycode met used:true', () => {
    const bewaking = new CodeBewaking();
    const abonnement = nepAbonnement();
    const beeindig = vi.fn();

    bewaking.volg(abonnement.abonneer, beeindig);
    abonnement.meld(true, { used: true });

    expect(beeindig).toHaveBeenCalledOnce();
  });

  it('beëindigt de sessie als het codedocument is verwijderd', () => {
    const bewaking = new CodeBewaking();
    const abonnement = nepAbonnement();
    const beeindig = vi.fn();

    bewaking.volg(abonnement.abonneer, beeindig);
    abonnement.meld(false);

    expect(beeindig).toHaveBeenCalledOnce();
  });

  it('logt maar een keer uit, ook als het nieuws twee keer komt', () => {
    // Firestore kan dezelfde wijziging eerst uit de cache en daarna van de
    // server melden.
    const bewaking = new CodeBewaking();
    const abonnement = nepAbonnement();
    const beeindig = vi.fn();

    bewaking.volg(abonnement.abonneer, beeindig);
    abonnement.meld(true, { active: false });
    abonnement.meld(false);

    expect(beeindig).toHaveBeenCalledOnce();
  });

  it('stopt met luisteren zodra de sessie is beeindigd', () => {
    const bewaking = new CodeBewaking();
    const abonnement = nepAbonnement();

    bewaking.volg(abonnement.abonneer, vi.fn());
    abonnement.meld(true, { active: false });

    expect(abonnement.stop).toHaveBeenCalledOnce();
    expect(bewaking.actief).toBe(false);
  });

  it('ruimt op bij uitloggen', () => {
    const bewaking = new CodeBewaking();
    const abonnement = nepAbonnement();

    bewaking.volg(abonnement.abonneer, vi.fn());
    bewaking.stop();

    expect(abonnement.stop).toHaveBeenCalledOnce();
    expect(bewaking.actief).toBe(false);
  });

  it('stoppen mag vaker', () => {
    const bewaking = new CodeBewaking();
    const abonnement = nepAbonnement();

    bewaking.volg(abonnement.abonneer, vi.fn());
    bewaking.stop();
    bewaking.stop();

    expect(abonnement.stop).toHaveBeenCalledOnce();
  });

  it('vervangt een lopende bewaking bij een nieuwe sessie', () => {
    // Bij het herstellen van een sessie na een herlading zou anders een
    // luisteraar blijven hangen op de code van de vorige inlog.
    const bewaking = new CodeBewaking();
    const eerste = nepAbonnement();
    const tweede = nepAbonnement();
    const beeindig = vi.fn();

    bewaking.volg(eerste.abonneer, beeindig);
    bewaking.volg(tweede.abonneer, beeindig);

    expect(eerste.stop).toHaveBeenCalledOnce();

    // De oude luisteraar praat niet meer mee.
    eerste.meld(true, { active: false });
    expect(beeindig).not.toHaveBeenCalled();

    tweede.meld(true, { active: false });
    expect(beeindig).toHaveBeenCalledOnce();
  });

  it('houdt een kapotte stopfunctie binnenboord', () => {
    const bewaking = new CodeBewaking();
    bewaking.volg(() => () => {
      throw new Error('stuk');
    }, vi.fn());

    expect(() => bewaking.stop()).not.toThrow();
    expect(bewaking.actief).toBe(false);
  });
});
