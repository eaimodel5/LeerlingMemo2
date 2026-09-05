import { describe, it, expect } from 'vitest';
import { bepaalSignalen, voortgangPerKlas, SignaleringInvoer } from './signalering';
import { Leerling, DocentVak, MemoTW1TW2 } from '../models/data.models';

const JAAR = '2026-2027';

function leerling(over: Partial<Leerling> = {}): Leerling {
  return {
    id: 'l' + Math.random(), leerlingnummer: '114334', leerling: 'Dae Aartsen', klas: '3HB',
    mentorNaam: 'Bart Houtman', mentorEmail: 'bhoutman@emmauscollege.nl',
    schooljaar: JAAR, actief: true, ...over
  };
}

function koppeling(over: Partial<DocentVak> = {}): DocentVak {
  return {
    id: 'd' + Math.random(), docentNaam: 'B. Houtman', docentEmail: 'bhoutman@emmauscollege.nl',
    vak: 'Wiskunde', klas: '3HB', schooljaar: JAAR, actief: true, ...over
  };
}

function memo(over: Partial<MemoTW1TW2> = {}): MemoTW1TW2 {
  return {
    id: 'm' + Math.random(), schooljaar: JAAR, toetsweek: 'TW1', leerlingnummer: '114334',
    leerling: 'Dae Aartsen', klas: '3HB', docentNaam: 'B. Houtman',
    docentEmail: 'bhoutman@emmauscollege.nl', vak: 'Wiskunde',
    aandachtInhoudelijkBegrip: false, aandachtPlanningOrganisatie: false,
    aandachtToetsvoorbereidingLeerstrategie: false, aandachtInzetWerkhouding: false,
    aandachtWerkNietOpOrde: false, aandachtAanwezigheidVerzuim: false,
    waarZieJeDitAan: '', watWerktWel: '', leerlingActie: '', emc: 'Nee', docentActie: '',
    status: 'Definitief', aangemaaktDoor: '', aangemaaktOp: '', gewijzigdOp: '', ...over
  };
}

function invoer(over: Partial<SignaleringInvoer> = {}): SignaleringInvoer {
  return {
    leerlingen: [], docentVakken: [], memoTW1TW2: [], memoTW3: [], docentTaken: [],
    schooljaar: JAAR, ...over
  };
}

describe('signalering', () => {
  it('meldt niets als alles klopt', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling()],
      docentVakken: [koppeling()]
    }));
    expect(signalen).toEqual([]);
  });

  it('vindt leerlingen zonder klas en noemt ze bij naam', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling({ klas: '', leerling: 'Hamlet Abate', leerlingnummer: '114335' })],
      docentVakken: [koppeling()]
    }));
    const signaal = signalen.find(s => s.code === 'leerling-zonder-klas');
    expect(signaal?.aantal).toBe(1);
    expect(signaal?.ernst).toBe('blokkerend');
    expect(signaal?.voorbeelden[0]).toContain('Hamlet Abate');
  });

  it('meldt een ontbrekende mentor niet dubbel bij een leerling zonder klas', () => {
    // Anders telt dezelfde leerling in twee signalen mee en lijkt het probleem groter.
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling({ klas: '', mentorNaam: '' })],
      docentVakken: [koppeling()]
    }));
    expect(signalen.find(s => s.code === 'leerling-zonder-mentor')).toBeUndefined();
  });

  it('vindt klassen waar geen enkele vakdocent aan gekoppeld is', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling({ klas: '4VD' }), leerling()],
      docentVakken: [koppeling()]
    }));
    const signaal = signalen.find(s => s.code === 'klas-zonder-docenten');
    expect(signaal?.aantal).toBe(1);
    expect(signaal?.voorbeelden).toEqual(['4VD']);
  });

  it('vindt een memo op een vak dat niet aan de klas hangt', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling()],
      docentVakken: [koppeling()],
      memoTW1TW2: [memo({ vak: 'Wiskunde B' })]
    }));
    expect(signalen.find(s => s.code === 'memo-zonder-koppeling')?.aantal).toBe(1);
  });

  it('let niet op hoofdletters bij het vergelijken van vakken', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling()],
      docentVakken: [koppeling({ vak: 'wiskunde' })],
      memoTW1TW2: [memo({ vak: 'Wiskunde' })]
    }));
    expect(signalen.find(s => s.code === 'memo-zonder-koppeling')).toBeUndefined();
  });

  it('vindt dubbele leerlingnummers', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling(), leerling()],
      docentVakken: [koppeling()]
    }));
    expect(signalen.find(s => s.code === 'dubbele-leerling')?.aantal).toBe(1);
  });

  it('zet blokkerende signalen bovenaan', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling({ klas: '' }), leerling({ mentorEmail: '' })],
      docentVakken: [koppeling()],
      memoTW1TW2: [memo({ vak: 'Onbekend vak' })]
    }));
    expect(signalen[0].ernst).toBe('blokkerend');
    expect(signalen[signalen.length - 1].ernst).toBe('informatief');
  });

  it('kijkt alleen naar het gekozen schooljaar', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling({ klas: '', schooljaar: '2025-2026' })],
      docentVakken: [koppeling()]
    }));
    expect(signalen.find(s => s.code === 'leerling-zonder-klas')).toBeUndefined();
  });

  it('herkent gekoppelde taken via docentAfkorting (modern)', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling()],
      docentVakken: [koppeling({ docentAfkorting: 'vis', docentEmail: 'oud@school.nl' })],
      docentTaken: [{
        id: 't1',
        schooljaar: JAAR,
        periode: 'TW1',
        klas: '3HB',
        leerlingnummer: '114334',
        leerling: 'Dae Aartsen',
        vak: 'Wiskunde',
        docentAfkorting: 'vis',
        docentEmail: 'nieuw@school.nl',
        docentNaam: 'B. Houtman',
        mentorEmail: 'mentor@school.nl',
        status: 'Open',
        aangemaaktOp: '',
        gewijzigdOp: ''
      }]
    }));
    expect(signalen.find(s => s.code === 'taak-zonder-docent')).toBeUndefined();
  });

  it('herkent wezentaak als noch afkorting noch e-mail overeenkomt', () => {
    const signalen = bepaalSignalen(invoer({
      leerlingen: [leerling()],
      docentVakken: [koppeling({ docentAfkorting: 'jan', docentEmail: 'jansen@school.nl' })],
      docentTaken: [{
        id: 't1',
        schooljaar: JAAR,
        periode: 'TW1',
        klas: '3HB',
        leerlingnummer: '114334',
        leerling: 'Dae Aartsen',
        vak: 'Wiskunde',
        docentAfkorting: 'vis',
        docentEmail: 'visser@school.nl',
        docentNaam: 'B. Houtman',
        mentorEmail: 'mentor@school.nl',
        status: 'Open',
        aangemaaktOp: '',
        gewijzigdOp: ''
      }]
    }));
    expect(signalen.find(s => s.code === 'taak-zonder-docent')?.aantal).toBe(1);
  });
});

describe('voortgangPerKlas', () => {
  const basis = {
    ...invoer({
      leerlingen: [
        leerling({ leerlingnummer: '1', leerling: 'Een' }),
        leerling({ leerlingnummer: '2', leerling: 'Twee' })
      ],
      docentVakken: [koppeling({ vak: 'Wiskunde' }), koppeling({ vak: 'Engels' })]
    }),
    periode: 'TW1',
    opSlot: () => false
  };

  it('rekent verwacht uit als leerlingen maal vakdocenten', () => {
    const rijen = voortgangPerKlas(basis);
    expect(rijen).toHaveLength(1);
    expect(rijen[0]).toMatchObject({ klas: '3HB', leerlingen: 2, verwachteMemos: 4, ingevuldeMemos: 0 });
  });

  it('telt alleen memo\'s van de gekozen periode', () => {
    const rijen = voortgangPerKlas({
      ...basis,
      memoTW1TW2: [
        memo({ leerlingnummer: '1', vak: 'Wiskunde' }),
        memo({ leerlingnummer: '2', vak: 'Engels', toetsweek: 'TW2' })
      ]
    });
    expect(rijen[0].ingevuldeMemos).toBe(1);
  });

  it('telt een taak niet meer als openstaand zodra de memo er is', () => {
    const taak = {
      id: 't1', schooljaar: JAAR, periode: 'TW1' as const, klas: '3HB', leerlingnummer: '1',
      leerling: 'Een', docentEmail: 'bhoutman@emmauscollege.nl', docentNaam: 'B. Houtman',
      vak: 'Wiskunde', mentorEmail: '', status: 'Open' as const, aangemaaktOp: '', gewijzigdOp: ''
    };
    expect(voortgangPerKlas({ ...basis, docentTaken: [taak] })[0].openstaandeTaken).toBe(1);
    expect(voortgangPerKlas({
      ...basis, docentTaken: [taak], memoTW1TW2: [memo({ leerlingnummer: '1', vak: 'Wiskunde' })]
    })[0].openstaandeTaken).toBe(0);
  });
});
