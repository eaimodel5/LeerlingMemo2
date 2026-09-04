import { describe, it, expect } from 'vitest';
import { herkenInlogFout, normaliseerCode, INLOG_MELDINGEN } from './inlogfout';

describe('herkenInlogFout', () => {
  it('herkent dat anoniem inloggen uitstaat in de Firebase-console', () => {
    expect(herkenInlogFout({ code: 'auth/operation-not-allowed' })).toBe('anoniem-inloggen-uit');
    expect(herkenInlogFout({ code: 'auth/admin-restricted-operation' })).toBe('anoniem-inloggen-uit');
  });

  it('herkent een netwerkprobleem, zowel van Auth als van Firestore', () => {
    expect(herkenInlogFout({ code: 'auth/network-request-failed' })).toBe('geen-verbinding');
    expect(herkenInlogFout({ code: 'unavailable' })).toBe('geen-verbinding');
    expect(herkenInlogFout({ code: 'deadline-exceeded' })).toBe('geen-verbinding');
  });

  it('herkent een weigering door de beveiligingsregels', () => {
    // Dit was de storing: de regels weigerden de zoekopdracht en dat kwam als
    // "ongeldige code" in beeld.
    expect(herkenInlogFout({ code: 'permission-denied' })).toBe('geen-rechten');
  });

  it('valt terug op onbekend bij iets zonder code', () => {
    expect(herkenInlogFout(new Error('kapot'))).toBe('onbekend');
    expect(herkenInlogFout(undefined)).toBe('onbekend');
    expect(herkenInlogFout(null)).toBe('onbekend');
  });

  it('heeft voor elke oorzaak een melding die iets uitlegt', () => {
    for (const tekst of Object.values(INLOG_MELDINGEN)) {
      expect(tekst.length).toBeGreaterThan(20);
    }
    expect(INLOG_MELDINGEN['anoniem-inloggen-uit']).toContain('Anonymous');
  });
});

describe('normaliseerCode', () => {
  it('maakt er hoofdletters van, want de code is het document-ID', () => {
    expect(normaliseerCode('xhru-6jkc')).toBe('XHRU-6JKC');
  });

  it('haalt geplakte spaties weg', () => {
    expect(normaliseerCode('  XHRU-6JKC \n')).toBe('XHRU-6JKC');
  });

  it('laat het streepje staan', () => {
    expect(normaliseerCode('XHRU-6JKC')).toBe('XHRU-6JKC');
  });

  it('geeft een lege tekst terug bij alleen spaties', () => {
    expect(normaliseerCode('   ')).toBe('');
  });
});
