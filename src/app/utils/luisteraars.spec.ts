import { describe, it, expect, vi } from 'vitest';
import { Luisteraars } from './luisteraars';

describe('Luisteraars', () => {
  it('begint uit', () => {
    const bundel = new Luisteraars();
    expect(bundel.actief).toBe(false);
    expect(bundel.aantal).toBe(0);
  });

  it('zet de luisteraars op en onthoudt hoeveel het er zijn', () => {
    const bundel = new Luisteraars();
    const gestart = bundel.start(() => [vi.fn(), vi.fn(), vi.fn()]);

    expect(gestart).toBe(true);
    expect(bundel.actief).toBe(true);
    expect(bundel.aantal).toBe(3);
  });

  it('start niet twee keer', () => {
    // Het effect dat hierop staat kan meerdere keren lopen; een tweede ronde
    // zou acht extra luisteraars op dezelfde collecties opleveren, en dus elke
    // wijziging dubbel verwerken.
    const bundel = new Luisteraars();
    const maak = vi.fn(() => [vi.fn()]);

    expect(bundel.start(maak)).toBe(true);
    expect(bundel.start(maak)).toBe(false);
    expect(maak).toHaveBeenCalledTimes(1);
    expect(bundel.aantal).toBe(1);
  });

  it('stopt alles en meldt hoeveel er liepen', () => {
    const bundel = new Luisteraars();
    const stoppers = [vi.fn(), vi.fn()];
    bundel.start(() => stoppers);

    expect(bundel.stop()).toBe(2);
    for (const stopper of stoppers) expect(stopper).toHaveBeenCalledOnce();
    expect(bundel.actief).toBe(false);
  });

  it('stopt niets als er niets liep', () => {
    const bundel = new Luisteraars();
    expect(bundel.stop()).toBe(0);
  });

  it('stopt maar een keer', () => {
    const bundel = new Luisteraars();
    const stopper = vi.fn();
    bundel.start(() => [stopper]);

    bundel.stop();
    expect(bundel.stop()).toBe(0);
    expect(stopper).toHaveBeenCalledOnce();
  });

  it('laat een kapotte stopper de rest niet tegenhouden', () => {
    // Anders blijven de overige zeven luisteraars draaien na het uitloggen, en
    // dat zijn precies degenen die dan foutmeldingen produceren.
    const bundel = new Luisteraars();
    const kapot = vi.fn(() => {
      throw new Error('stuk');
    });
    const daarna = vi.fn();
    bundel.start(() => [kapot, daarna]);

    expect(() => bundel.stop()).not.toThrow();
    expect(daarna).toHaveBeenCalledOnce();
    expect(bundel.actief).toBe(false);
  });

  it('kan na stoppen opnieuw starten', () => {
    // Dit is het geval dat eerder misging: uitloggen en in hetzelfde tabblad
    // opnieuw inloggen. De luisteraars kwamen toen niet meer terug.
    const bundel = new Luisteraars();
    const eerste = vi.fn();
    const tweede = vi.fn();

    bundel.start(() => [eerste]);
    bundel.stop();
    expect(bundel.start(() => [tweede])).toBe(true);
    expect(bundel.actief).toBe(true);

    bundel.stop();
    expect(tweede).toHaveBeenCalledOnce();
    expect(eerste).toHaveBeenCalledOnce();
  });
});
