import { describe, it, expect } from 'vitest';
import { Memo1Component } from './memo-1.component';
import { maakOmgeving } from '../../testing/testbed';
import {
  DOCENT,
  DOCENT2,
  KLAS,
  LEERLINGNUMMER,
  SCHOOLJAAR,
  VAK,
  maakDocentVak,
  maakLeerling,
  maakLock,
  maakMemoTW12,
  maakTaak,
} from '../../testing/factories';
import { NepDataService } from '../../testing/nep-dataservice';

/** De klas, leerling en docent-vakkoppeling die een memo nodig heeft. */
function basisgegevens(data: NepDataService) {
  data.leerlingen.set([maakLeerling()]);
  data.docentVakken.set([maakDocentVak()]);
}

/**
 * Vult het formulier zoals een docent dat doet: eerst de leerling en het vak
 * kiezen, dan pas de tekst.
 *
 * Die volgorde is niet willekeurig. Zodra leerling en vak bekend zijn, laadt
 * het scherm een eventuele bestaande memo in en maakt het de tekstvelden
 * anders leeg. Alles in een keer invullen leverde daarom een leeg formulier op.
 */
async function vulFormulier(
  component: Memo1Component,
  ververs: () => Promise<void>,
  over: Record<string, unknown> = {},
) {
  component.form.patchValue({ klas: KLAS, leerlingId: 'leerling-1', docentVakId: 'docentvak-1' });
  await ververs();
  component.form.patchValue({
    waarZieJeDitAan: 'Levert werk te laat in.',
    leerlingActie: 'Gebruikt de agenda.',
    docentActie: 'Wekelijks navragen.',
    ...over,
  });
  await ververs();
}

describe('Docent: memo TW1 invullen', () => {
  it('slaat een nieuwe memo op met de gegevens uit het formulier', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: basisgegevens,
    });

    await vulFormulier(component, ververs);
    await component.submitFinal();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(1);
    const memo = data.memoTW1TW2()[0];
    expect(memo.leerlingnummer).toBe(LEERLINGNUMMER);
    expect(memo.vak).toBe(VAK);
    expect(memo.toetsweek).toBe('TW1');
    expect(memo.schooljaar).toBe(SCHOOLJAAR);
    expect(memo.status).toBe('Definitief');
    expect(memo.waarZieJeDitAan).toBe('Levert werk te laat in.');
  });

  it('schrijft de memo op naam van de ingelogde docent', async () => {
    // Kwam eerder uit de gekozen Docent/Vak-regel. Een docent kon daarmee in
    // andermans naam schrijven.
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: basisgegevens,
    });

    await vulFormulier(component, ververs);
    await component.submitFinal();
    await ververs();

    expect(data.memoTW1TW2()[0].docentEmail).toBe(DOCENT.email);
  });

  it('werkt een bestaande eigen memo bij in plaats van er een tweede naast te zetten', async () => {
    // Eerst Concept, dan Definitief maakte twee losse documenten voor dezelfde
    // leerling en hetzelfde vak; het mentoroverzicht toonde ze allebei.
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: basisgegevens,
    });

    await vulFormulier(component, ververs);
    await component.submitDraft();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(1);
    expect(data.memoTW1TW2()[0].status).toBe('Concept');

    component.form.patchValue({ waarZieJeDitAan: 'Bijgewerkt na de toetsweek.' });
    await ververs();
    await component.submitFinal();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(1);
    expect(data.memoTW1TW2()[0].status).toBe('Definitief');
    expect(data.memoTW1TW2()[0].waarZieJeDitAan).toBe('Bijgewerkt na de toetsweek.');
  });

  it('bewaart wie de memo oorspronkelijk maakte bij een bijwerking', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: d => {
        basisgegevens(d);
        d.memoTW1TW2.set([
          maakMemoTW12({ id: 'bestaand', status: 'Concept', aangemaaktOp: '2026-01-01T00:00:00.000Z' }),
        ]);
      },
    });

    await vulFormulier(component, ververs);
    await component.submitFinal();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(1);
    expect(data.memoTW1TW2()[0].aangemaaktOp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('laat de memo van een collega op hetzelfde vak met rust', async () => {
    // De sleutel bevat de docent. Zonder hem overschreven twee docenten die
    // hetzelfde vak aan dezelfde leerling geven elkaars memo.
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: d => {
        basisgegevens(d);
        d.memoTW1TW2.set([
          maakMemoTW12({ id: 'van-collega', docentEmail: DOCENT2.email, docentNaam: DOCENT2.naam }),
        ]);
      },
    });

    await vulFormulier(component, ververs);
    await component.submitFinal();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(2);
    const vanCollega = data.memoTW1TW2().find(m => m.id === 'van-collega');
    expect(vanCollega?.docentEmail).toBe(DOCENT2.email);
  });

  it('zet de bijbehorende taak op ingevuld', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: d => {
        basisgegevens(d);
        d.docentTaken.set([maakTaak({ id: 'taak', periode: 'TW1', status: 'Open' })]);
      },
    });

    await vulFormulier(component, ververs);
    await component.submitFinal();
    await ververs();

    expect(data.docentTaken()[0].status).toBe('Ingevuld');
  });

  it('slaat niets op als een verplicht veld leeg is', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: basisgegevens,
    });

    await vulFormulier(component, ververs, { waarZieJeDitAan: '' });
    await component.submitFinal();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(0);
  });

  it('slaat niets op als de klas op slot staat', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: d => {
        basisgegevens(d);
        d.classLocks.set([maakLock({ periode: 'TW1', isLocked: true })]);
      },
    });

    await vulFormulier(component, ververs);
    await component.submitFinal();
    await ververs();

    expect(component.isLocked()).toBe(true);
    expect(data.memoTW1TW2()).toHaveLength(0);
  });

  it('meldt het als de opslag mislukt, en houdt de invoer vast', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: basisgegevens,
    });

    await vulFormulier(component, ververs);
    data.volgendeSchrijffout = 'Geen rechten om dit op te slaan.';
    await component.submitFinal();
    await ververs();

    expect(component.melding()?.soort).toBe('fout');
    expect(component.form.value.waarZieJeDitAan).toBe('Levert werk te laat in.');
  });
});

describe('Docent: alleen de eigen koppelingen', () => {
  it('toont een vakdocent alleen zijn eigen docent-vakregels', async () => {
    const { component, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: d => {
        d.leerlingen.set([maakLeerling()]);
        d.docentVakken.set([
          maakDocentVak({ id: 'van-mij' }),
          maakDocentVak({ id: 'van-collega', docentEmail: DOCENT2.email, docentNaam: DOCENT2.naam }),
        ]);
      },
    });

    component.form.patchValue({ klas: KLAS });
    await ververs();

    expect(component.filteredDocentVakken().map(dv => dv.id)).toEqual(['van-mij']);
  });

  it('toont een mentor het volledige overzicht van de klas', async () => {
    const { component, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Mentor',
      vul: d => {
        d.leerlingen.set([maakLeerling()]);
        d.docentVakken.set([
          maakDocentVak({ id: 'een' }),
          maakDocentVak({ id: 'twee', docentEmail: DOCENT2.email, docentNaam: DOCENT2.naam }),
        ]);
      },
    });

    component.form.patchValue({ klas: KLAS });
    await ververs();

    expect(component.filteredDocentVakken()).toHaveLength(2);
  });

  it('waarschuwt een docent zonder koppeling in deze klas', async () => {
    const { component, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      vul: d => {
        d.leerlingen.set([maakLeerling()]);
        d.docentVakken.set([maakDocentVak({ docentEmail: DOCENT2.email, docentNaam: DOCENT2.naam })]);
      },
    });

    component.form.patchValue({ klas: KLAS });
    await ververs();

    expect(component.nietGekoppeld()).toBe(true);
  });

  it('toont een vakdocent met docentAfkorting de eigen regels op basis van afkorting', async () => {
    const { component, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      gebruiker: { docentAfkorting: 'vis', email: 'visser@school.nl' },
      vul: d => {
        d.leerlingen.set([maakLeerling()]);
        d.docentVakken.set([
          maakDocentVak({ id: 'van-vis', docentAfkorting: 'vis', docentEmail: 'ander@school.nl' }),
          maakDocentVak({ id: 'van-jan', docentAfkorting: 'jan', docentEmail: 'jansen@school.nl' }),
        ]);
      },
    });

    component.form.patchValue({ klas: KLAS });
    await ververs();

    expect(component.filteredDocentVakken().map(dv => dv.id)).toEqual(['van-vis']);
  });

  it('slaat docentAfkorting op in de memo bij indiening door docent met afkorting', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo1Component, {
      rol: 'Docent',
      gebruiker: { docentAfkorting: 'vis', email: 'visser@school.nl' },
      vul: d => {
        d.leerlingen.set([maakLeerling()]);
        d.docentVakken.set([maakDocentVak({ id: 'dv-vis', docentAfkorting: 'vis', docentEmail: 'visser@school.nl' })]);
      },
    });

    component.form.patchValue({ klas: KLAS, leerlingId: 'leerling-1', docentVakId: 'dv-vis' });
    await ververs();
    component.form.patchValue({
      waarZieJeDitAan: 'Aandachtspunt waargenomen.',
      leerlingActie: 'Oefenen.',
      docentActie: 'Begeleiden.',
    });
    await ververs();

    await component.submitFinal();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(1);
    const opgeslagen = data.memoTW1TW2()[0];
    expect(opgeslagen.docentAfkorting).toBe('vis');
    expect(opgeslagen.docentEmail).toBe('visser@school.nl');
  });
});
