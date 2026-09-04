import { describe, it, expect } from 'vitest';
import { AccessCode } from '../models/data.models';
import {
  actieveCodes,
  actieveCodesMetRol,
  bezwaarTegenIntrekken,
  isActieveCode,
  magActiveren,
  magIntrekken,
  uitlegBijBezwaar,
} from './toegangscode';

function code(over: Partial<AccessCode> = {}): AccessCode {
  return {
    id: over.code ?? over.id ?? 'AAAA-BBBB',
    code: 'AAAA-BBBB',
    role: 'Docent',
    ownerName: 'Hans Visser',
    ownerEmail: 'visser@school.nl',
    createdAt: '2026-09-01T10:00:00.000Z',
    ...over,
  };
}

describe('isActieveCode', () => {
  it('rekent een code zonder het veld als actief', () => {
    // Codes van voor deze wijziging hebben `active` helemaal niet. Zouden die
    // als ingetrokken tellen, dan sluit het publiceren van de nieuwe regels
    // iedereen in een klap buiten.
    expect(isActieveCode(code())).toBe(true);
  });

  it('herkent een uitdrukkelijk actieve code', () => {
    expect(isActieveCode(code({ active: true }))).toBe(true);
  });

  it('herkent een ingetrokken code', () => {
    expect(isActieveCode(code({ active: false }))).toBe(false);
  });

  it('telt het oude used-veld ook als ingetrokken', () => {
    // Dat veld is nooit gezet, maar staat er wel; buitensluiten is de veilige kant.
    expect(isActieveCode(code({ used: true }))).toBe(false);
    expect(isActieveCode(code({ active: true, used: true }))).toBe(false);
  });

  it('geeft false bij niets', () => {
    expect(isActieveCode(null)).toBe(false);
    expect(isActieveCode(undefined)).toBe(false);
  });
});

describe('filteren op actief', () => {
  const alle = [
    code({ id: 'a', active: true }),
    code({ id: 'b', active: false }),
    code({ id: 'c' }),
    code({ id: 'd', role: 'Superuser', active: true }),
    code({ id: 'e', role: 'Superuser', active: false }),
  ];

  it('houdt alleen de bruikbare codes over', () => {
    expect(actieveCodes(alle).map(c => c.id)).toEqual(['a', 'c', 'd']);
  });

  it('filtert daarbinnen op rol', () => {
    expect(actieveCodesMetRol(alle, 'Superuser').map(c => c.id)).toEqual(['d']);
    expect(actieveCodesMetRol(alle, 'Docent').map(c => c.id)).toEqual(['a', 'c']);
  });
});

describe('intrekken', () => {
  it('mag bij een gewone code', () => {
    const doel = code({ id: 'docent', role: 'Docent' });
    expect(magIntrekken(doel, [doel])).toBe(true);
  });

  it('mag niet twee keer', () => {
    const doel = code({ id: 'docent', active: false });
    expect(bezwaarTegenIntrekken(doel, [doel])).toBe('al-ingetrokken');
    expect(magIntrekken(doel, [doel])).toBe(false);
  });

  it('mag niet bij de laatste actieve beheerderscode', () => {
    // Trek je die in, dan kan niemand nog codes aanmaken -- en dat aanmaken is
    // zelf aan de beheerder voorbehouden. Je komt er dan alleen uit met de hand
    // in de Firebase-console.
    const enige = code({ id: 'beheer', role: 'Superuser' });
    expect(bezwaarTegenIntrekken(enige, [enige])).toBe('laatste-beheerder');
    expect(uitlegBijBezwaar('laatste-beheerder')).toContain('tweede beheerderscode');
  });

  it('mag wel zodra er een tweede actieve beheerderscode is', () => {
    const eerste = code({ id: 'beheer-1', role: 'Superuser' });
    const tweede = code({ id: 'beheer-2', role: 'Superuser' });
    expect(magIntrekken(eerste, [eerste, tweede])).toBe(true);
    expect(magIntrekken(tweede, [eerste, tweede])).toBe(true);
  });

  it('telt een ingetrokken beheerderscode niet mee als vangnet', () => {
    const actief = code({ id: 'beheer-1', role: 'Superuser' });
    const ingetrokken = code({ id: 'beheer-2', role: 'Superuser', active: false });
    expect(bezwaarTegenIntrekken(actief, [actief, ingetrokken])).toBe('laatste-beheerder');
  });

  it('telt een mentor- of coordinatorcode niet mee als beheerder', () => {
    const beheerder = code({ id: 'beheer', role: 'Superuser' });
    const coordinator = code({ id: 'coord', role: 'Coordinator' });
    expect(bezwaarTegenIntrekken(beheerder, [beheerder, coordinator])).toBe('laatste-beheerder');
  });

  it('laat de laatste docentcode gewoon intrekken', () => {
    const beheerder = code({ id: 'beheer', role: 'Superuser' });
    const docent = code({ id: 'docent', role: 'Docent' });
    expect(magIntrekken(docent, [beheerder, docent])).toBe(true);
  });
});

describe('weer activeren', () => {
  it('kan bij een ingetrokken code', () => {
    expect(magActiveren(code({ active: false }))).toBe(true);
  });

  it('heeft geen zin bij een actieve code', () => {
    expect(magActiveren(code({ active: true }))).toBe(false);
    expect(magActiveren(code())).toBe(false);
  });

  it('kan ook bij een code met het oude used-veld', () => {
    expect(magActiveren(code({ used: true }))).toBe(true);
  });
});
