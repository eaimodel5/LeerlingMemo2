import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManageDocentenComponent } from './manage-docenten.component';
import { maakOmgeving, nepDialogen } from '../../testing/testbed';
import { DOCENT, DOCENT2, maakDocent, maakDocentVak } from '../../testing/factories';

let dialogen = nepDialogen();
beforeEach(() => {
  dialogen = nepDialogen(true);
});
afterEach(() => dialogen.herstel());

describe('Docenten beheren', () => {
  it('slaat een nieuwe docent op met de afkorting in kleine letters', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });

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
    const { component } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d => d.docenten.set([maakDocent({ afkorting: 'vis' })]),
    });

    expect(component.toon('vis')).toBe('VIS');
  });

  it('weigert een afkorting die al vergeven is', async () => {
    const { component, ververs } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d => d.docenten.set([maakDocent({ afkorting: 'vis' })]),
    });

    component.nieuw();
    component.zetVeld('afkorting', 'VIS');
    component.zetVeld('naam', 'Iemand anders');
    await ververs();

    expect(component.afkortingFout()).toBe('bestaat-al');
    expect(component.kanBewaren()).toBe(false);
  });

  it('weigert een afkorting met een spatie of punt erin', async () => {
    const { component, ververs } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });

    component.nieuw();
    component.zetVeld('naam', 'Hans Visser');
    component.zetVeld('afkorting', 'v.is');
    await ververs();

    expect(component.afkortingFout()).toBe('ongeldige-tekens');
  });

  it('wil ook een naam', async () => {
    const { component, ververs } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });

    component.nieuw();
    component.zetVeld('afkorting', 'vis');
    await ververs();

    expect(component.afkortingFout()).toBeNull();
    expect(component.kanBewaren()).toBe(false);
  });

  it('bewaart de aanmaakdatum bij het bewerken van een bestaande docent', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d => d.docenten.set([maakDocent({ afkorting: 'vis', aangemaaktOp: '2026-01-01T00:00:00.000Z' })]),
    });

    component.bewerk(data.docenten()[0]);
    component.zetVeld('naam', 'H. Visser');
    await ververs();
    await component.bewaar();
    await ververs();

    expect(data.docenten()).toHaveLength(1);
    expect(data.docenten()[0].naam).toBe('H. Visser');
    expect(data.docenten()[0].aangemaaktOp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('laat een bestaande docent niet met zichzelf botsen', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d => d.docenten.set([maakDocent({ afkorting: 'vis' })]),
    });

    component.bewerk(data.docenten()[0]);
    await ververs();

    expect(component.afkortingFout()).toBeNull();
    expect(component.kanBewaren()).toBe(true);
  });

  it('meldt het als opslaan mislukt', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });

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
    const { component } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });
    expect(component.magVerwijderen()).toBe(false);
  });

  it('mag wel door een coordinator', async () => {
    const { component } = await maakOmgeving(ManageDocentenComponent, { rol: 'Coordinator' });
    expect(component.magVerwijderen()).toBe(true);
  });

  it('haalt de docent uit de lijst', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Coordinator',
      vul: d => d.docenten.set([maakDocent({ afkorting: 'vis' })]),
    });

    await component.verwijder(data.docenten()[0]);
    await ververs();

    expect(data.docenten()).toHaveLength(0);
  });
});

describe('Docenten: wie mist er nog een afkorting', () => {
  it('noemt namen uit de koppelingen die hier nog niet staan', async () => {
    const { component } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d => {
        d.docentVakken.set([
          maakDocentVak({ id: 'a', vak: 'Wiskunde' }),
          maakDocentVak({ id: 'b', vak: 'Natuurkunde' }),
          maakDocentVak({ id: 'c', docentNaam: DOCENT2.naam, docentEmail: DOCENT2.email }),
        ]);
      },
    });

    const ontbreekt = component.zonderAfkorting();
    expect(ontbreekt.map(o => o.naam).sort()).toEqual([DOCENT.naam, DOCENT2.naam].sort());
    // Twee koppelingen van dezelfde docent tellen als één docent.
    expect(ontbreekt.find(o => o.naam === DOCENT.naam)?.aantalKoppelingen).toBe(2);
  });

  it('laat een docent weg zodra die op e-mailadres bekend is', async () => {
    const { component } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d => {
        d.docenten.set([maakDocent({ afkorting: 'vis', email: DOCENT.email })]);
        d.docentVakken.set([maakDocentVak()]);
      },
    });

    expect(component.zonderAfkorting()).toHaveLength(0);
  });

  it('laat een docent ook weg als alleen de naam overeenkomt', async () => {
    // Niet elke koppeling heeft een e-mailadres; dat is een van de redenen om
    // van adressen af te willen.
    const { component } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d => {
        d.docenten.set([maakDocent({ afkorting: 'vis', naam: DOCENT.naam, email: undefined })]);
        d.docentVakken.set([maakDocentVak({ docentEmail: '' })]);
      },
    });

    expect(component.zonderAfkorting()).toHaveLength(0);
  });

  it('raadt geen afkorting bij het voorvullen', async () => {
    // De schoolafkorting is leidend. Een gok uit 'Hans Visser' is later niet
    // meer te onderscheiden van een goede invoer.
    const { component } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d => d.docentVakken.set([maakDocentVak()]),
    });

    component.nieuwVoor(component.zonderAfkorting()[0]);

    expect(component.formulier()?.afkorting).toBe('');
    expect(component.formulier()?.naam).toBe(DOCENT.naam);
    expect(component.formulier()?.email).toBe(DOCENT.email);
  });
});

describe('Docenten: CSV-import', () => {
  const kop = 'afkorting;naam;email;actief\n';

  it('leest de rijen in', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });

    await component.verwerkImport(kop + 'VIS;Hans Visser;visser@school.nl;ja\njns;Jansen;jansen@school.nl;nee\n');
    await ververs();

    expect(data.docenten().map(d => d.afkorting).sort()).toEqual(['jns', 'vis']);
    expect(data.docenten().find(d => d.afkorting === 'jns')?.actief).toBe(false);
  });

  it('gaat door na een rij die niet deugt, en meldt welke', async () => {
    // Bij vijftig docenten wil je niet dat één typefout de andere
    // negenenveertig tegenhoudt.
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });

    await component.verwerkImport(kop + 'v is;Kapotte afkorting;;ja\nvis;Hans Visser;;ja\n;Geen afkorting;;ja\n');
    await ververs();

    expect(data.docenten().map(d => d.afkorting)).toEqual(['vis']);
    expect(component.melding()?.soort).toBe('wacht');
    expect(component.melding()?.tekst).toContain('2 overgeslagen');
  });

  it('slaat een dubbele afkorting binnen hetzelfde bestand over', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });

    await component.verwerkImport(kop + 'vis;Hans Visser;;ja\nVIS;Nog een Visser;;ja\n');
    await ververs();

    expect(data.docenten()).toHaveLength(1);
    expect(data.docenten()[0].naam).toBe('Hans Visser');
  });

  it('werkt een bestaande docent bij in plaats van te weigeren', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d => d.docenten.set([maakDocent({ afkorting: 'vis', naam: 'Oude naam' })]),
    });

    await component.verwerkImport(kop + 'vis;Hans Visser;;ja\n');
    await ververs();

    expect(data.docenten()).toHaveLength(1);
    expect(data.docenten()[0].naam).toBe('Hans Visser');
  });

  it('klaagt over een ontbrekende kopregel', async () => {
    const { component, ververs } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });

    await component.verwerkImport('naam;email\nHans Visser;visser@school.nl\n');
    await ververs();

    expect(component.melding()?.soort).toBe('fout');
    expect(component.melding()?.tekst).toContain('afkorting');
  });

  it('doet niets bij een bestand zonder regels', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageDocentenComponent, { rol: 'Mentor' });

    await component.verwerkImport(kop);
    await ververs();

    expect(data.docenten()).toHaveLength(0);
    expect(component.melding()?.soort).toBe('fout');
  });
});

describe('Docenten: zoeken en filteren', () => {
  it('verbergt niet-actieve docenten tenzij je erom vraagt', async () => {
    const { component, ververs } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d =>
        d.docenten.set([
          maakDocent({ afkorting: 'vis', actief: true }),
          maakDocent({ afkorting: 'jns', naam: 'Jansen', actief: false }),
        ]),
    });

    expect(component.zichtbaar().map(d => d.afkorting)).toEqual(['vis']);

    component.toonInactief.set(true);
    await ververs();

    expect(component.zichtbaar().map(d => d.afkorting)).toEqual(['jns', 'vis']);
  });

  it('zoekt op afkorting en op naam', async () => {
    const { component, ververs } = await maakOmgeving(ManageDocentenComponent, {
      rol: 'Mentor',
      vul: d =>
        d.docenten.set([
          maakDocent({ afkorting: 'vis', naam: 'Hans Visser' }),
          maakDocent({ afkorting: 'jns', naam: 'Jansen' }),
        ]),
    });

    component.zoek.set('jns');
    await ververs();
    expect(component.zichtbaar().map(d => d.afkorting)).toEqual(['jns']);

    component.zoek.set('visser');
    await ververs();
    expect(component.zichtbaar().map(d => d.afkorting)).toEqual(['vis']);
  });
});
