import { describe, it, expect } from 'vitest';
import { AccessCode } from '../models/data.models';
import {
  actieveCodes,
  moetUitloggenNaIntrekken,
  sessieMoetStoppen,
  veldenVoorActiveren,
  veldenVoorIntrekken,
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

describe('wat er wordt weggeschreven bij intrekken en activeren', () => {
  it('intrekken zet active op false', () => {
    const velden = veldenVoorIntrekken('2026-09-04T12:00:00.000Z');
    expect(velden.active).toBe(false);
    expect(velden.gewijzigdOp).toBe('2026-09-04T12:00:00.000Z');
  });

  it('activeren zet active op true en used op false', () => {
    // Alleen `active: true` volstond niet. De geldigheidscontrole leest
    // `active !== false && used !== true`; bij een legacydocument bleef die
    // tweede voorwaarde anders onwaar.
    const velden = veldenVoorActiveren();
    expect(velden.active).toBe(true);
    expect(velden.used).toBe(false);
  });

  it('een ingetrokken code is daarna echt ingetrokken', () => {
    expect(isActieveCode({ ...code({ active: true }), ...veldenVoorIntrekken() })).toBe(false);
  });

  it('een geactiveerde code is daarna echt actief', () => {
    expect(isActieveCode({ ...code({ active: false }), ...veldenVoorActiveren() })).toBe(true);
  });

  it('een legacycode met used:true wordt door activeren echt bruikbaar', () => {
    // Dit was het randgeval: het scherm meldde dat de code weer actief was,
    // terwijl isActieveCode() en firestore.rules hem bleven weigeren.
    const legacy: Partial<AccessCode> = code({ used: true });
    delete legacy.active;
    expect(isActieveCode(legacy)).toBe(false);

    expect(isActieveCode({ ...legacy, ...veldenVoorActiveren() })).toBe(true);
  });

  it('laat een gewone actieve code werken zoals hij deed', () => {
    const gewoon = code({ active: true, used: false });
    expect(isActieveCode(gewoon)).toBe(true);
    expect(isActieveCode({ ...gewoon, ...veldenVoorActiveren() })).toBe(true);
  });
});

describe('de eigen code intrekken', () => {
  it('vraagt om uitloggen als het je eigen code is', () => {
    expect(moetUitloggenNaIntrekken('AAAA-BBBB', 'AAAA-BBBB')).toBe(true);
  });

  it('laat je met rust bij de code van iemand anders', () => {
    expect(moetUitloggenNaIntrekken('CCCC-DDDD', 'AAAA-BBBB')).toBe(false);
  });

  it('vergelijkt hoofdletterongevoelig en zonder spaties', () => {
    expect(moetUitloggenNaIntrekken(' aaaa-bbbb ', 'AAAA-BBBB')).toBe(true);
  });

  it('doet niets als een van beide ontbreekt', () => {
    expect(moetUitloggenNaIntrekken('AAAA-BBBB', undefined)).toBe(false);
    expect(moetUitloggenNaIntrekken(undefined, 'AAAA-BBBB')).toBe(false);
    expect(moetUitloggenNaIntrekken('', '')).toBe(false);
  });
});

describe('moet de sessie stoppen op grond van het eigen codedocument', () => {
  it('nee bij een actieve code', () => {
    expect(sessieMoetStoppen(true, { active: true, used: false })).toBe(false);
  });

  it('nee bij een code zonder het veld active', () => {
    expect(sessieMoetStoppen(true, {})).toBe(false);
  });

  it('ja bij een ingetrokken code', () => {
    expect(sessieMoetStoppen(true, { active: false })).toBe(true);
  });

  it('ja bij een legacycode met used:true', () => {
    expect(sessieMoetStoppen(true, { used: true })).toBe(true);
  });

  it('ja als het document is verwijderd', () => {
    expect(sessieMoetStoppen(false)).toBe(true);
  });
});
