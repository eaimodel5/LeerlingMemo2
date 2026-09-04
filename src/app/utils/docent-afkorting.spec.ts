import { describe, it, expect } from 'vitest';
import {
  AFKORTING_MAX,
  AFKORTING_MIN,
  afkortingIsGeldig,
  controleerAfkorting,
  normaliseerAfkorting,
  toonAfkorting,
  uitlegBijAfkortingFout,
  zelfdeAfkorting,
} from './docent-afkorting';

describe('normaliseren', () => {
  it('maakt er kleine letters van', () => {
    expect(normaliseerAfkorting('VIS')).toBe('vis');
    expect(normaliseerAfkorting('Vis')).toBe('vis');
  });

  it('haalt omringende spaties weg', () => {
    expect(normaliseerAfkorting('  vis \n')).toBe('vis');
  });

  it('geeft een lege tekst bij niets', () => {
    expect(normaliseerAfkorting(null)).toBe('');
    expect(normaliseerAfkorting(undefined)).toBe('');
    expect(normaliseerAfkorting('   ')).toBe('');
  });

  it('toont hem op het scherm in hoofdletters, zoals op het rooster', () => {
    expect(toonAfkorting('vis')).toBe('VIS');
    expect(toonAfkorting(' Vis ')).toBe('VIS');
    expect(toonAfkorting(undefined)).toBe('');
  });
});

describe('vergelijken', () => {
  it('herkent dezelfde docent ongeacht schrijfwijze', () => {
    expect(zelfdeAfkorting('vis', 'VIS')).toBe(true);
    expect(zelfdeAfkorting(' vis ', 'vis')).toBe(true);
  });

  it('houdt verschillende docenten uit elkaar', () => {
    expect(zelfdeAfkorting('vis', 'jns')).toBe(false);
  });

  it('rekent leeg nooit als een match', () => {
    // Anders zouden alle docenten zonder afkorting elkaars gelijke zijn --
    // precies de fout die met e-mailadressen ook al op de loer lag.
    expect(zelfdeAfkorting('', '')).toBe(false);
    expect(zelfdeAfkorting(null, undefined)).toBe(false);
    expect(zelfdeAfkorting('vis', '')).toBe(false);
  });
});

describe('controleren', () => {
  it('laat een gewone afkorting door', () => {
    expect(controleerAfkorting('vis')).toBeNull();
    expect(afkortingIsGeldig('VIS')).toBe(true);
  });

  it('staat cijfers toe', () => {
    // Scholen hebben nu eenmaal een tweede Visser.
    expect(controleerAfkorting('vis2')).toBeNull();
  });

  it('wil geen lege waarde', () => {
    expect(controleerAfkorting('')).toBe('leeg');
    expect(controleerAfkorting('   ')).toBe('leeg');
    expect(controleerAfkorting(null)).toBe('leeg');
  });

  it('weigert spaties en leestekens', () => {
    // De afkorting wordt het document-ID; een punt of slash geeft daar
    // subtiele ellende, en `v.is` naast `vis` is later niet meer uit elkaar te
    // houden.
    expect(controleerAfkorting('v is')).toBe('ongeldige-tekens');
    expect(controleerAfkorting('v.is')).toBe('ongeldige-tekens');
    expect(controleerAfkorting('vis/2')).toBe('ongeldige-tekens');
    expect(controleerAfkorting('vïs')).toBe('ongeldige-tekens');
  });

  it('houdt een ondergrens en een bovengrens aan', () => {
    expect(controleerAfkorting('v')).toBe('te-kort');
    expect(controleerAfkorting('v'.repeat(AFKORTING_MIN))).toBeNull();
    expect(controleerAfkorting('v'.repeat(AFKORTING_MAX))).toBeNull();
    expect(controleerAfkorting('v'.repeat(AFKORTING_MAX + 1))).toBe('te-lang');
  });

  it('weigert een afkorting die al vergeven is', () => {
    expect(controleerAfkorting('vis', ['jns', 'vis'])).toBe('bestaat-al');
  });

  it('vergelijkt daarbij hoofdletterongevoelig', () => {
    expect(controleerAfkorting('VIS', ['vis'])).toBe('bestaat-al');
    expect(controleerAfkorting('vis', ['VIS'])).toBe('bestaat-al');
  });

  it('laat een docent niet met zichzelf botsen bij het bewerken', () => {
    expect(controleerAfkorting('vis', ['vis', 'jns'], 'vis')).toBeNull();
  });

  it('maar wel met een ander', () => {
    expect(controleerAfkorting('jns', ['vis', 'jns'], 'vis')).toBe('bestaat-al');
  });

  it('heeft voor elke fout een uitleg die iets zegt', () => {
    for (const fout of ['leeg', 'te-kort', 'te-lang', 'ongeldige-tekens', 'bestaat-al'] as const) {
      expect(uitlegBijAfkortingFout(fout).length).toBeGreaterThan(15);
    }
  });
});
