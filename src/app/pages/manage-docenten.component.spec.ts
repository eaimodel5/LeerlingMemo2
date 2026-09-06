import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManageDocentenComponent } from './manage-docenten.component';
import { maakOmgeving, nepDialogen } from '../../testing/testbed';
import {
  DOCENT,
  DOCENT2,
  maakDocent,
  maakDocentVak,
  maakTaak,
  maakMemoTW12,
  maakMemoTW3,
} from '../../testing/factories';

let dialogen = nepDialogen();

beforeEach(() => {
  dialogen = nepDialogen(true);
});

afterEach(() => dialogen.herstel());

describe('Docenten beheren', () => {
  it('slaat een nieuwe docent op met de afkorting in kleine letters', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    component.nieuw();
    component.zetVeld('afkorting', 'VIS');
    component.zetVeld('naam', 'Hans Visser');
    await ververs();

    await component.bewaar();
    await ververs();

    expect(data.docenten()).toHaveLength(1);
    expect(data.docenten()[0].afkorting).toBe('vis');
    expect(data.docenten()[0].naam).toBe('Hans Visser');
  });

  it('toont de afkorting op het scherm in hoofdletters', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docenten.set([
            maakDocent({ afkorting: 'vis' }),
          ]),
      },
    );

    expect(component.toon('vis')).toBe('VIS');
  });

  it('weigert een afkorting die al vergeven is', async () => {
    const { component, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docenten.set([
            maakDocent({ afkorting: 'vis' }),
          ]),
      },
    );

    component.nieuw();
    component.zetVeld('afkorting', 'VIS');
    component.zetVeld('naam', 'Iemand anders');
    await ververs();

    expect(component.afkortingFout()).toBe('bestaat-al');
    expect(component.kanBewaren()).toBe(false);
  });

  it('weigert een afkorting met een spatie of punt erin', async () => {
    const { component, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    component.nieuw();
    component.zetVeld('naam', 'Hans Visser');
    component.zetVeld('afkorting', 'v.is');
    await ververs();

    expect(component.afkortingFout()).toBe('ongeldige-tekens');
  });

  it('wil ook een naam', async () => {
    const { component, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    component.nieuw();
    component.zetVeld('afkorting', 'vis');
    await ververs();

    expect(component.afkortingFout()).toBeNull();
    expect(component.kanBewaren()).toBe(false);
  });

  it('bewaart de aanmaakdatum bij het bewerken van een bestaande docent', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              aangemaaktOp: '2026-01-01T00:00:00.000Z',
            }),
          ]),
      },
    );

    component.bewerk(data.docenten()[0]);
    component.zetVeld('naam', 'H. Visser');
    await ververs();

    await component.bewaar();
    await ververs();

    expect(data.docenten()).toHaveLength(1);
    expect(data.docenten()[0].naam).toBe('H. Visser');
    expect(data.docenten()[0].aangemaaktOp).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('laat een bestaande docent niet met zichzelf botsen', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docenten.set([
            maakDocent({ afkorting: 'vis' }),
          ]),
      },
    );

    component.bewerk(data.docenten()[0]);
    await ververs();

    expect(component.afkortingFout()).toBeNull();
    expect(component.kanBewaren()).toBe(true);
  });

  it('meldt het als opslaan mislukt', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    component.nieuw();
    component.zetVeld('afkorting', 'vis');
    component.zetVeld('naam', 'Hans Visser');
    await ververs();

    data.volgendeSchrijffout = 'Geen rechten.';

    await component.bewaar();
    await ververs();

    expect(component.melding()?.soort).toBe('fout');
  });
});

describe('Docenten: verwijderen', () => {
  it('mag niet door een mentor', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    expect(component.magVerwijderen()).toBe(false);
  });

  it('mag wel door een coordinator', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Coordinator' },
    );

    expect(component.magVerwijderen()).toBe(true);
  });

  it('haalt de docent uit de lijst', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Coordinator',
        vul: d =>
          d.docenten.set([
            maakDocent({ afkorting: 'vis' }),
          ]),
      },
    );

    await component.verwijder(data.docenten()[0]);
    await ververs();

    expect(data.docenten()).toHaveLength(0);
  });
});

describe('Docenten: wie mist er nog een afkorting', () => {
  it('noemt namen uit de koppelingen die hier nog niet staan', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docentVakken.set([
            maakDocentVak({
              id: 'a',
              vak: 'Wiskunde',
            }),
            maakDocentVak({
              id: 'b',
              vak: 'Natuurkunde',
            }),
            maakDocentVak({
              id: 'c',
              docentNaam: DOCENT2.naam,
              docentEmail: DOCENT2.email,
            }),
          ]);
        },
      },
    );

    const ontbreekt = component.zonderAfkorting();

    expect(
      ontbreekt.map(o => o.naam).sort(),
    ).toEqual(
      [DOCENT.naam, DOCENT2.naam].sort(),
    );

    expect(
      ontbreekt.find(o => o.naam === DOCENT.naam)
        ?.aantalKoppelingen,
    ).toBe(2);
  });

  it('houdt een legacykoppeling zichtbaar zolang docentAfkorting ontbreekt, ook bij gelijke naam', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: DOCENT.naam,
            }),
          ]);

          d.docentVakken.set([
            maakDocentVak({
              id: 'koppeling-1',
            }),
          ]);
        },
      },
    );

    const ontbreekt = component.zonderAfkorting();

    expect(ontbreekt).toHaveLength(1);
    expect(ontbreekt[0].naam).toBe(DOCENT.naam);
    expect(ontbreekt[0].legacyEmail).toBe(DOCENT.email);

    expect(
      ontbreekt[0].koppelingIds,
    ).toEqual(['koppeling-1']);
  });

  it('werkt ook bij een koppeling zonder e-mailadres', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docentVakken.set([
            maakDocentVak({
              id: 'zonder-email',
              docentEmail: '',
            }),
          ]),
      },
    );

    const ontbreekt = component.zonderAfkorting();

    expect(ontbreekt).toHaveLength(1);
    expect(ontbreekt[0].naam).toBe(DOCENT.naam);
    expect(ontbreekt[0].legacyEmail).toBe('');
    expect(ontbreekt[0].koppelingIds).toEqual([
      'zonder-email',
    ]);
  });

  it('toont het legacyadres wel, maar slaat het niet op in Docent', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docentVakken.set([
            maakDocentVak({
              id: 'koppeling-1',
            }),
          ]),
      },
    );

    expect(
      component.zonderAfkorting()[0].legacyEmail,
    ).toBe(DOCENT.email);

    component.nieuwVoor(
      component.zonderAfkorting()[0],
    );

    component.zetVeld('afkorting', 'vis');
    await ververs();

    await component.bewaar();
    await ververs();

    expect(data.docenten()).toHaveLength(1);

    expect(
      Object.keys(data.docenten()[0]),
    ).not.toContain('email');
  });

  it('raadt geen afkorting bij het voorvullen', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docentVakken.set([
            maakDocentVak({
              id: 'koppeling-1',
            }),
          ]),
      },
    );

    component.nieuwVoor(
      component.zonderAfkorting()[0],
    );

    expect(
      component.formulier()?.afkorting,
    ).toBe('');

    expect(
      component.formulier()?.naam,
    ).toBe(DOCENT.naam);
  });
});

describe('Docenten: migratie-readiness', () => {
  it('is pas gereed als alle 4 collecties een bekende docentafkorting hebben', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
            }),
          ]);

          d.docentVakken.set([
            maakDocentVak({
              id: 'koppeling-1',
              docentAfkorting: 'VIS',
            }),
          ]);
          d.docentTaken.set([
            maakTaak({
              id: 'taak-1',
              docentAfkorting: 'vis',
            }),
          ]);
          d.memoTW1TW2.set([
            maakMemoTW12({
              id: 'memo1-1',
              docentAfkorting: 'VIS',
            }),
          ]);
          d.memoTW3.set([
            maakMemoTW3({
              id: 'memo3-1',
              docentAfkorting: 'vis',
            }),
          ]);
        },
      },
    );

    const status = component.migratieStatus();

    expect(status.gereed).toBe(true);
    expect(status.totaalRecords).toBe(4);
    expect(status.metAfkorting).toBe(4);
    expect(status.zonderAfkorting).toBe(0);
    expect(status.onbekendeAfkorting).toBe(0);
    expect(status.dubbeleAfkortingen).toEqual([]);
  });

  it('is niet gereed als een koppeling nog geen docentafkorting heeft', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
            }),
          ]);

          d.docentVakken.set([
            maakDocentVak({
              id: 'koppeling-1',
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    const status = component.migratieStatus();

    expect(status.gereed).toBe(false);
    expect(status.problemen).toContainEqual({
      collectie: 'Docenten/Vakken',
      recordId: 'koppeling-1',
      soort: 'ontbreekt',
    });
  });

  it('is niet gereed als een taak nog geen docentafkorting heeft', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([maakDocent({ afkorting: 'vis' })]);
          d.docentTaken.set([maakTaak({ id: 'taak-1', docentAfkorting: undefined })]);
        },
      },
    );

    const status = component.migratieStatus();

    expect(status.gereed).toBe(false);
    expect(status.problemen).toContainEqual({
      collectie: 'DocentTaken',
      recordId: 'taak-1',
      soort: 'ontbreekt',
    });
  });

  it('is niet gereed als een memo TW1/TW2 naar een onbekende afkorting verwijst', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([maakDocent({ afkorting: 'vis' })]);
          d.memoTW1TW2.set([maakMemoTW12({ id: 'memo1-1', docentAfkorting: 'onbekend' })]);
        },
      },
    );

    const status = component.migratieStatus();

    expect(status.gereed).toBe(false);
    expect(status.problemen).toContainEqual({
      collectie: 'Memo TW1/TW2',
      recordId: 'memo1-1',
      soort: 'onbekend',
      docentAfkorting: 'onbekend',
    });
  });

  it('is niet gereed als een memo TW3 naar een onbekende afkorting verwijst', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([maakDocent({ afkorting: 'vis' })]);
          d.memoTW3.set([maakMemoTW3({ id: 'memo3-1', docentAfkorting: 'onbekend' })]);
        },
      },
    );

    const status = component.migratieStatus();

    expect(status.gereed).toBe(false);
    expect(status.problemen).toContainEqual({
      collectie: 'Memo TW3',
      recordId: 'memo3-1',
      soort: 'onbekend',
      docentAfkorting: 'onbekend',
    });
  });

  it('is niet gereed bij dubbele docentafkortingen', async () => {
    const { component } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
            }),
            maakDocent({
              afkorting: 'VIS',
              naam: 'Tweede Visser',
            }),
          ]);
        },
      },
    );

    const status = component.migratieStatus();

    expect(status.gereed).toBe(false);
    expect(status.dubbeleAfkortingen).toEqual([
      'vis',
    ]);
  });
});

describe('Docenten: expliciete backfill', () => {
  it('backfillt een DocentVak expliciet na beheerkeuze', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
            }),
          ]);

          d.docentVakken.set([
            maakDocentVak({
              id: 'koppeling-1',
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    const ontbreekt =
      component.zonderAfkorting()[0];

    expect(ontbreekt.doelen).toEqual([
      { collectie: 'docentVakken', id: 'koppeling-1' },
    ]);

    component.koppelBestaande(ontbreekt);

    expect(component.kanKoppelen()).toBe(false);

    component.zetKoppelingAfkorting('VIS');
    await ververs();

    expect(component.kanKoppelen()).toBe(true);

    await component.bewaarKoppeling();
    await ververs();

    expect(
      data.docentVakken()[0].docentAfkorting,
    ).toBe('vis');

    expect(
      component.koppelingFormulier(),
    ).toBeNull();
  });

  it('backfillt een DocentTaak expliciet na beheerkeuze', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
            }),
          ]);

          d.docentTaken.set([
            maakTaak({
              id: 'taak-1',
              docentNaam: 'Hans Visser',
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    const ontbreekt =
      component.zonderAfkorting()[0];

    expect(ontbreekt.doelen).toEqual([
      { collectie: 'docentTaken', id: 'taak-1' },
    ]);

    component.koppelBestaande(ontbreekt);
    component.zetKoppelingAfkorting('VIS');
    await ververs();

    await component.bewaarKoppeling();
    await ververs();

    expect(
      data.docentTaken()[0].docentAfkorting,
    ).toBe('vis');
  });

  it('backfillt een Memo TW1/TW2 expliciet na beheerkeuze', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
            }),
          ]);

          d.memoTW1TW2.set([
            maakMemoTW12({
              id: 'memo1-1',
              docentNaam: 'Hans Visser',
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    const ontbreekt =
      component.zonderAfkorting()[0];

    expect(ontbreekt.doelen).toEqual([
      { collectie: 'memoTW1TW2', id: 'memo1-1' },
    ]);

    component.koppelBestaande(ontbreekt);
    component.zetKoppelingAfkorting('VIS');
    await ververs();

    await component.bewaarKoppeling();
    await ververs();

    expect(
      data.memoTW1TW2()[0].docentAfkorting,
    ).toBe('vis');
  });

  it('backfillt een Memo TW3 expliciet na beheerkeuze', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
            }),
          ]);

          d.memoTW3.set([
            maakMemoTW3({
              id: 'memo3-1',
              docentNaam: 'Hans Visser',
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    const ontbreekt =
      component.zonderAfkorting()[0];

    expect(ontbreekt.doelen).toEqual([
      { collectie: 'memoTW3', id: 'memo3-1' },
    ]);

    component.koppelBestaande(ontbreekt);
    component.zetKoppelingAfkorting('VIS');
    await ververs();

    await component.bewaarKoppeling();
    await ververs();

    expect(
      data.memoTW3()[0].docentAfkorting,
    ).toBe('vis');
  });

  it('werkt voor één legacy-identiteit alle exacte doelen over meerdere collecties bij', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
            }),
          ]);

          d.docentVakken.set([
            maakDocentVak({
              id: 'vak-1',
              docentEmail: 'visser@school.nl',
              docentAfkorting: undefined,
            }),
          ]);
          d.docentTaken.set([
            maakTaak({
              id: 'taak-1',
              docentEmail: 'visser@school.nl',
              docentAfkorting: undefined,
            }),
          ]);
          d.memoTW1TW2.set([
            maakMemoTW12({
              id: 'memo1-1',
              docentEmail: 'visser@school.nl',
              docentAfkorting: undefined,
            }),
          ]);
          d.memoTW3.set([
            maakMemoTW3({
              id: 'memo3-1',
              docentEmail: 'visser@school.nl',
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    const ontbrekend = component.zonderAfkorting();
    expect(ontbrekend).toHaveLength(1);
    expect(ontbrekend[0].doelen).toEqual([
      { collectie: 'docentVakken', id: 'vak-1' },
      { collectie: 'docentTaken', id: 'taak-1' },
      { collectie: 'memoTW1TW2', id: 'memo1-1' },
      { collectie: 'memoTW3', id: 'memo3-1' },
    ]);

    component.koppelBestaande(ontbrekend[0]);
    component.zetKoppelingAfkorting('vis');

    await component.bewaarKoppeling();
    await ververs();

    expect(data.docentVakken()[0].docentAfkorting).toBe('vis');
    expect(data.docentTaken()[0].docentAfkorting).toBe('vis');
    expect(data.memoTW1TW2()[0].docentAfkorting).toBe('vis');
    expect(data.memoTW3()[0].docentAfkorting).toBe('vis');
  });

  it('koppelt nooit automatisch op alleen een gelijke naam', async () => {
    const { component, data } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: DOCENT.naam,
            }),
          ]);

          d.docentVakken.set([
            maakDocentVak({
              id: 'koppeling-1',
              docentNaam: DOCENT.naam,
              docentAfkorting: undefined,
            }),
          ]);
          d.docentTaken.set([
            maakTaak({
              id: 'taak-1',
              docentNaam: DOCENT.naam,
              docentAfkorting: undefined,
            }),
          ]);
          d.memoTW1TW2.set([
            maakMemoTW12({
              id: 'memo1-1',
              docentNaam: DOCENT.naam,
              docentAfkorting: undefined,
            }),
          ]);
          d.memoTW3.set([
            maakMemoTW3({
              id: 'memo3-1',
              docentNaam: DOCENT.naam,
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    expect(data.docentVakken()[0].docentAfkorting).toBeUndefined();
    expect(data.docentTaken()[0].docentAfkorting).toBeUndefined();
    expect(data.memoTW1TW2()[0].docentAfkorting).toBeUndefined();
    expect(data.memoTW3()[0].docentAfkorting).toBeUndefined();
    expect(component.zonderAfkorting().length).toBeGreaterThan(0);
    expect(component.migratieStatus().gereed).toBe(false);
  });

  it('overschrijft een bestaand Docent-record niet wanneer hieraan gekoppeld wordt', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
              aangemaaktOp: '2026-01-01T10:00:00Z',
              actief: true,
            }),
          ]);

          d.docentTaken.set([
            maakTaak({
              id: 'taak-1',
              docentNaam: 'Oude Niet-Canonieke Naam',
              docentEmail: 'oud@school.nl',
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    const ontbreekt = component.zonderAfkorting()[0];
    component.koppelBestaande(ontbreekt);
    component.zetKoppelingAfkorting('VIS');
    await component.bewaarKoppeling();
    await ververs();

    expect(data.docenten()).toHaveLength(1);
    expect(data.docenten()[0].afkorting).toBe('vis');
    expect(data.docenten()[0].naam).toBe('Hans Visser');
    expect(data.docenten()[0].aangemaaktOp).toBe('2026-01-01T10:00:00Z');
    expect(data.docenten()[0].actief).toBe(true);
    expect(data.docentTaken()[0].docentAfkorting).toBe('vis');
  });

  it('slaat een bewust nieuw aangemaakte docent eerst op en gebruikt deze daarna voor de backfill', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docentVakken.set([
            maakDocentVak({
              id: 'koppeling-1',
              docentNaam: 'Nieuwe Collega',
              docentAfkorting: undefined,
            }),
          ]);
          d.docentTaken.set([
            maakTaak({
              id: 'taak-1',
              docentNaam: 'Nieuwe Collega',
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    expect(data.docenten()).toHaveLength(0);

    const ontbreekt = component.zonderAfkorting()[0];
    component.nieuwVoor(ontbreekt);
    component.zetVeld('afkorting', 'NC');
    component.zetVeld('naam', 'Nieuwe Collega');
    await ververs();

    await component.bewaar();
    await ververs();

    expect(data.docenten()).toHaveLength(1);
    expect(data.docenten()[0].afkorting).toBe('nc');
    expect(data.docenten()[0].naam).toBe('Nieuwe Collega');

    expect(data.docentVakken()[0].docentAfkorting).toBe('nc');
    expect(data.docentTaken()[0].docentAfkorting).toBe('nc');
  });

  it('verwijdert of herschrijft legacy-e-mail en legacynaam niet tijdens de backfill', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
            }),
          ]);

          d.docentTaken.set([
            maakTaak({
              id: 'taak-1',
              docentNaam: 'Oude Naam Onveranderd',
              docentEmail: 'oude.email@school.nl',
              docentAfkorting: undefined,
            }),
          ]);
          d.memoTW1TW2.set([
            maakMemoTW12({
              id: 'memo1-1',
              docentNaam: 'Oude Naam Onveranderd',
              docentEmail: 'oude.email@school.nl',
              docentAfkorting: undefined,
            }),
          ]);
        },
      },
    );

    const ontbreekt = component.zonderAfkorting()[0];
    component.koppelBestaande(ontbreekt);
    component.zetKoppelingAfkorting('vis');
    await component.bewaarKoppeling();
    await ververs();

    const taak = data.docentTaken()[0];
    expect(taak.docentAfkorting).toBe('vis');
    expect(taak.docentNaam).toBe('Oude Naam Onveranderd');
    expect(taak.docentEmail).toBe('oude.email@school.nl');

    const memo = data.memoTW1TW2()[0];
    expect(memo.docentAfkorting).toBe('vis');
    expect(memo.docentNaam).toBe('Oude Naam Onveranderd');
    expect(memo.docentEmail).toBe('oude.email@school.nl');
  });

  it('wordt pas gereed nadat het laatste probleem over alle vier datasets is opgelost', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({ afkorting: 'vis', naam: 'Hans Visser' }),
            maakDocent({ afkorting: 'jns', naam: 'Jansen' }),
          ]);
          d.docentVakken.set([
            maakDocentVak({ id: 'vak-1', docentAfkorting: 'vis' }),
          ]);
          d.docentTaken.set([
            maakTaak({ id: 'taak-1', docentAfkorting: 'vis' }),
          ]);
          d.memoTW1TW2.set([
            maakMemoTW12({ id: 'memo1-1', docentAfkorting: 'vis' }),
          ]);
          d.memoTW3.set([
            maakMemoTW3({ id: 'memo3-1', docentAfkorting: undefined, docentNaam: 'Jansen' }),
          ]);
        },
      },
    );

    expect(component.migratieStatus().gereed).toBe(false);
    expect(component.zonderAfkorting()).toHaveLength(1);

    const ontbreekt = component.zonderAfkorting()[0];
    component.koppelBestaande(ontbreekt);
    component.zetKoppelingAfkorting('jns');
    await component.bewaarKoppeling();
    await ververs();

    expect(data.memoTW3()[0].docentAfkorting).toBe('jns');
    expect(component.zonderAfkorting()).toHaveLength(0);
    expect(component.migratieStatus().gereed).toBe(true);
  });

  it('meldt een duidelijke fout zonder rollback als een deel van de records niet kan worden bijgewerkt', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d => {
          d.docenten.set([
            maakDocent({ afkorting: 'vis', naam: 'Hans Visser' }),
          ]);
          d.docentVakken.set([
            maakDocentVak({ id: 'vak-1', docentEmail: 'visser@school.nl', docentAfkorting: undefined }),
          ]);
          d.docentTaken.set([
            maakTaak({ id: 'taak-1', docentEmail: 'visser@school.nl', docentAfkorting: undefined }),
          ]);
        },
      },
    );

    // Make updateDocentTaak fail
    data.updateDocentTaak = async () => {
      throw new Error('Firestore netwerkfout');
    };

    const ontbreekt = component.zonderAfkorting()[0];
    component.koppelBestaande(ontbreekt);
    component.zetKoppelingAfkorting('vis');
    await component.bewaarKoppeling();
    await ververs();

    // First one was updated, second failed (no rollback simulation)
    expect(data.docentVakken()[0].docentAfkorting).toBe('vis');
    expect(data.docentTaken()[0].docentAfkorting).toBeUndefined();

    expect(component.melding()?.soort).toBe('fout');
    expect(component.melding()?.tekst).toContain('Niet alle records konden worden bijgewerkt');
    expect(component.melding()?.tekst).toContain('Een deel is mogelijk al gekoppeld');
  });
});

describe('Docenten: CSV-import', () => {
  const kop = 'afkorting;naam;actief\n';

  it('leest de rijen in', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    await component.verwerkImport(
      kop +
        'VIS;Hans Visser;ja\n' +
        'jns;Jansen;nee\n',
    );

    await ververs();

    expect(
      data.docenten()
        .map(d => d.afkorting)
        .sort(),
    ).toEqual(['jns', 'vis']);

    expect(
      data.docenten()
        .find(d => d.afkorting === 'jns')
        ?.actief,
    ).toBe(false);
  });

  it('gaat door na een rij die niet deugt, en meldt welke', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    await component.verwerkImport(
      kop +
        'v is;Kapotte afkorting;ja\n' +
        'vis;Hans Visser;ja\n' +
        ';Geen afkorting;ja\n',
    );

    await ververs();

    expect(
      data.docenten().map(d => d.afkorting),
    ).toEqual(['vis']);

    expect(
      component.melding()?.soort,
    ).toBe('wacht');

    expect(
      component.melding()?.tekst,
    ).toContain('2 overgeslagen');
  });

  it('slaat een dubbele afkorting binnen hetzelfde bestand over', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    await component.verwerkImport(
      kop +
        'vis;Hans Visser;ja\n' +
        'VIS;Nog een Visser;ja\n',
    );

    await ververs();

    expect(data.docenten()).toHaveLength(1);
    expect(data.docenten()[0].naam).toBe('Hans Visser');
  });

  it('werkt een bestaande docent bij in plaats van te weigeren', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Oude naam',
            }),
          ]),
      },
    );

    await component.verwerkImport(
      kop + 'vis;Hans Visser;ja\n',
    );

    await ververs();

    expect(data.docenten()).toHaveLength(1);
    expect(data.docenten()[0].naam).toBe('Hans Visser');
  });

  it('negeert een e-mailkolom in het bestand', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    await component.verwerkImport(
      'afkorting;naam;email;actief\n' +
        'vis;Hans Visser;visser@school.nl;ja\n',
    );

    await ververs();

    expect(data.docenten()).toHaveLength(1);

    expect(
      Object.keys(data.docenten()[0]),
    ).not.toContain('email');
  });

  it('klaagt over een ontbrekende kopregel', async () => {
    const { component, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    await component.verwerkImport(
      'naam;email\n' +
        'Hans Visser;visser@school.nl\n',
    );

    await ververs();

    expect(
      component.melding()?.soort,
    ).toBe('fout');

    expect(
      component.melding()?.tekst,
    ).toContain('afkorting');
  });

  it('doet niets bij een bestand zonder regels', async () => {
    const { component, data, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      { rol: 'Mentor' },
    );

    await component.verwerkImport(kop);
    await ververs();

    expect(data.docenten()).toHaveLength(0);

    expect(
      component.melding()?.soort,
    ).toBe('fout');
  });
});

describe('Docenten: zoeken en filteren', () => {
  it('verbergt niet-actieve docenten tenzij je erom vraagt', async () => {
    const { component, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              actief: true,
            }),
            maakDocent({
              afkorting: 'jns',
              naam: 'Jansen',
              actief: false,
            }),
          ]),
      },
    );

    expect(
      component.zichtbaar().map(d => d.afkorting),
    ).toEqual(['vis']);

    component.toonInactief.set(true);
    await ververs();

    expect(
      component.zichtbaar().map(d => d.afkorting),
    ).toEqual(['jns', 'vis']);
  });

  it('zoekt op afkorting en op naam', async () => {
    const { component, ververs } = await maakOmgeving(
      ManageDocentenComponent,
      {
        rol: 'Mentor',
        vul: d =>
          d.docenten.set([
            maakDocent({
              afkorting: 'vis',
              naam: 'Hans Visser',
            }),
            maakDocent({
              afkorting: 'jns',
              naam: 'Jansen',
            }),
          ]),
      },
    );

    component.zoek.set('jns');
    await ververs();

    expect(
      component.zichtbaar().map(d => d.afkorting),
    ).toEqual(['jns']);

    component.zoek.set('visser');
    await ververs();

    expect(
      component.zichtbaar().map(d => d.afkorting),
    ).toEqual(['vis']);
  });
});
