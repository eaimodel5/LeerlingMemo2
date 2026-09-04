import { describe, it, expect } from 'vitest';
import { MentorPrepComponent } from './mentor-prep.component';
import { maakOmgeving } from '../../testing/testbed';
import {
  DOCENT,
  DOCENT2,
  KLAS,
  LEERLINGNUMMER,
  MENTOR,
  SCHOOLJAAR,
  maakDocentVak,
  maakLeerling,
  maakMemoTW12,
  maakMemoTW3,
  maakVoorbereiding,
} from '../../testing/factories';
import { NepDataService } from '../../testing/nep-dataservice';

function basisgegevens(data: NepDataService) {
  data.leerlingen.set([maakLeerling()]);
  data.docentVakken.set([maakDocentVak()]);
}

/** Kiest klas, leerling en periode zoals de mentor dat bovenin het scherm doet. */
async function kiesLeerling(
  component: MentorPrepComponent,
  ververs: () => Promise<void>,
  periode: 'TW1' | 'TW2' | 'TW3' = 'TW1',
) {
  component.form.patchValue({ klas: KLAS, leerlingnummer: LEERLINGNUMMER, periode });
  await ververs();
}

describe('Mentor: docentmemos inzien', () => {
  it('toont de memos van de gekozen leerling in de gekozen periode', async () => {
    const { component, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.memoTW1TW2.set([
          maakMemoTW12({ id: 'wiskunde', toetsweek: 'TW1' }),
          maakMemoTW12({ id: 'engels', toetsweek: 'TW1', vak: 'Engels', docentEmail: DOCENT2.email }),
          maakMemoTW12({ id: 'andere-periode', toetsweek: 'TW2' }),
          maakMemoTW12({ id: 'andere-leerling', leerlingnummer: '999999' }),
        ]);
      },
    });

    await kiesLeerling(component, ververs);

    expect(component.loadedMemos().map(m => m.id).sort()).toEqual(['engels', 'wiskunde']);
  });

  it('haalt in TW3 de memos uit de TW3-collectie', async () => {
    const { component, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.memoTW1TW2.set([maakMemoTW12({ id: 'tw1', toetsweek: 'TW1' })]);
        d.memoTW3.set([maakMemoTW3({ id: 'tw3' })]);
      },
    });

    await kiesLeerling(component, ververs, 'TW3');

    expect(component.loadedMemos().map(m => m.id)).toEqual(['tw3']);
  });

  it('toont niets zolang er geen leerling is gekozen', async () => {
    const { component } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.memoTW1TW2.set([maakMemoTW12()]);
      },
    });

    expect(component.loadedMemos()).toHaveLength(0);
  });
});

describe('Mentor: voorbereiding opslaan', () => {
  it('slaat een nieuwe voorbereiding op', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: basisgegevens,
    });

    await kiesLeerling(component, ververs);
    component.form.patchValue({ centraleBespreekvragen: 'Hoe gaat de planning?' });
    await ververs();
    await component.submitFinal();
    await ververs();

    expect(data.mentorVoorbereiding()).toHaveLength(1);
    const prep = data.mentorVoorbereiding()[0];
    expect(prep.leerlingnummer).toBe(LEERLINGNUMMER);
    expect(prep.periode).toBe('TW1');
    expect(prep.schooljaar).toBe(SCHOOLJAAR);
    expect(prep.status).toBe('Definitief');
    expect(prep.centraleBespreekvragen).toBe('Hoe gaat de planning?');
  });

  it('laadt een bestaande voorbereiding in plaats van een leeg formulier te tonen', async () => {
    // Het effect dat dit doet las eerder form.value in plaats van de signal,
    // registreerde daardoor geen afhankelijkheid en draaide nooit. De mentor
    // kreeg een leeg formulier en overschreef bij opslaan het bestaande record.
    const { component, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.mentorVoorbereiding.set([
          maakVoorbereiding({ centraleBespreekvragen: 'Eerder opgeschreven vraag.' }),
        ]);
      },
    });

    await kiesLeerling(component, ververs);

    expect(component.form.value.centraleBespreekvragen).toBe('Eerder opgeschreven vraag.');
  });

  it('werkt een bestaande voorbereiding bij in plaats van er een tweede naast te zetten', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.mentorVoorbereiding.set([maakVoorbereiding({ id: 'bestaand', status: 'Concept' })]);
      },
    });

    await kiesLeerling(component, ververs);
    component.form.patchValue({ overzichtResultaten: 'Bijgewerkt.' });
    await ververs();
    await component.submitFinal();
    await ververs();

    expect(data.mentorVoorbereiding()).toHaveLength(1);
    expect(data.mentorVoorbereiding()[0].id).toBe('bestaand');
    expect(data.mentorVoorbereiding()[0].overzichtResultaten).toBe('Bijgewerkt.');
    expect(data.mentorVoorbereiding()[0].status).toBe('Definitief');
  });

  it('houdt de periodes uit elkaar', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.mentorVoorbereiding.set([maakVoorbereiding({ id: 'tw1', periode: 'TW1' })]);
      },
    });

    await kiesLeerling(component, ververs, 'TW2');
    component.form.patchValue({ overzichtResultaten: 'Voor TW2.' });
    await ververs();
    await component.submitFinal();
    await ververs();

    expect(data.mentorVoorbereiding()).toHaveLength(2);
  });

  it('slaat niets op zonder gekozen leerling', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: basisgegevens,
    });

    await component.submitFinal();
    await ververs();

    expect(data.mentorVoorbereiding()).toHaveLength(0);
  });

  it('meldt het als de opslag mislukt', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: basisgegevens,
    });

    await kiesLeerling(component, ververs);
    data.volgendeSchrijffout = 'Geen verbinding.';
    await component.submitFinal();
    await ververs();

    expect(component.melding()?.soort).toBe('fout');
  });

  it('zet de mentor van de leerling in de voorbereiding', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: basisgegevens,
    });

    await kiesLeerling(component, ververs);
    await component.submitDraft();
    await ververs();

    expect(data.mentorVoorbereiding()[0].mentorNaam).toBe(MENTOR.naam);
    expect(data.mentorVoorbereiding()[0].status).toBe('Concept');
  });
});

describe('Mentor: memos van vakdocenten beheren', () => {
  it('mag een memo verwijderen', async () => {
    const { component, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.memoTW1TW2.set([maakMemoTW12({ id: 'weg' })]);
      },
    });

    await kiesLeerling(component, ververs);

    expect(component.magVerwijderen()).toBe(true);
  });

  it('een vakdocent mag dat niet', async () => {
    // De knop stond eerder zonder rolcontrole in het scherm; de regels weigerden
    // de actie wel, dus de klik leverde alleen een foutmelding op.
    const { component } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Docent',
      vul: basisgegevens,
    });

    expect(component.magVerwijderen()).toBe(false);
  });

  it('legt bij een correctie vast wie hem maakte', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorPrepComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.memoTW1TW2.set([maakMemoTW12({ id: 'memo', aangemaaktDoor: DOCENT.email })]);
      },
    });

    await kiesLeerling(component, ververs);
    component.openEditModal(component.loadedMemos()[0]);
    component.editMemoForm.patchValue({ waarZieJeDitAan: 'Door de mentor bijgewerkt.' });
    await ververs();
    await component.saveEditedMemo();
    await ververs();

    const memo = data.memoTW1TW2()[0];
    expect(memo.waarZieJeDitAan).toBe('Door de mentor bijgewerkt.');
    expect(memo.gewijzigdDoor).toBe(MENTOR.email);
    // De oorspronkelijke opsteller blijft de docent.
    expect(memo.aangemaaktDoor).toBe(DOCENT.email);
  });
});

describe('Coordinator en beheerder houden de mentorfunctionaliteit', () => {
  for (const rol of ['Coordinator', 'Superuser'] as const) {
    it(`${rol} kan een voorbereiding opslaan en memos verwijderen`, async () => {
      const { component, data, ververs } = await maakOmgeving(MentorPrepComponent, {
        rol,
        vul: d => {
          basisgegevens(d);
          d.memoTW1TW2.set([maakMemoTW12()]);
        },
      });

      await kiesLeerling(component, ververs);
      expect(component.loadedMemos()).toHaveLength(1);
      expect(component.magVerwijderen()).toBe(true);

      component.form.patchValue({ overzichtResultaten: 'Gezien.' });
      await ververs();
      await component.submitFinal();
      await ververs();

      expect(data.mentorVoorbereiding()).toHaveLength(1);
    });
  }
});
