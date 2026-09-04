import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MentorOverviewComponent } from './mentor-overview.component';
import { maakOmgeving, nepDialogen } from '../../testing/testbed';
import {
  DOCENT,
  DOCENT2,
  KLAS,
  VAK,
  maakDocentVak,
  maakLeerling,
  maakMemoTW12,
  maakTaak,
} from '../../testing/factories';
import { NepDataService } from '../../testing/nep-dataservice';

/** Eén klas met één leerling en twee gekoppelde vakdocenten. */
function klasMetTweeVakken(data: NepDataService) {
  data.leerlingen.set([maakLeerling()]);
  data.docentVakken.set([
    maakDocentVak({ id: 'wis', vak: VAK }),
    maakDocentVak({ id: 'eng', vak: 'Engels', docentNaam: DOCENT2.naam, docentEmail: DOCENT2.email }),
  ]);
}

async function kiesKlas(component: MentorOverviewComponent, ververs: () => Promise<void>) {
  component.klas.set(KLAS);
  await ververs();
}

// De knoppen hieronder vragen om bevestiging met een browserdialoog; die
// bestaat in de testomgeving niet en telt dan als "nee".
let dialogen = nepDialogen();
beforeEach(() => { dialogen = nepDialogen(true); });
afterEach(() => dialogen.herstel());

describe('Mentor: statusbord van de klas', () => {
  it('zet een kolom neer per gekoppeld vak', async () => {
    const { component, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: klasMetTweeVakken,
    });

    await kiesKlas(component, ververs);

    expect(component.vakKolommen().map(k => k.vak)).toEqual(['Engels', VAK]);
  });

  it('begint met alles op "niet gevraagd"', async () => {
    const { component, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: klasMetTweeVakken,
    });

    await kiesKlas(component, ververs);

    expect(component.bordTelling()).toMatchObject({ 'niet-gevraagd': 2, open: 0, ingevuld: 0, spontaan: 0 });
    expect(component.aantalNogUitTeZetten()).toBe(2);
  });

  it('zet een cel op "open" zodra er een taak staat', async () => {
    const { component, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: d => {
        klasMetTweeVakken(d);
        d.docentTaken.set([maakTaak({ vak: VAK, periode: 'TW1' })]);
      },
    });

    await kiesKlas(component, ververs);

    expect(component.bordTelling()).toMatchObject({ 'niet-gevraagd': 1, open: 1 });
  });

  it('zet een cel op "ingevuld" zodra de memo binnen is', async () => {
    // De status wordt afgeleid uit het bestaan van de memo, niet uit het
    // statusveld van de taak. Dat veld werd alleen bijgewerkt als de docent via
    // de link binnenkwam.
    const { component, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: d => {
        klasMetTweeVakken(d);
        d.docentTaken.set([maakTaak({ vak: VAK, periode: 'TW1', status: 'Open' })]);
        d.memoTW1TW2.set([maakMemoTW12({ vak: VAK, toetsweek: 'TW1' })]);
      },
    });

    await kiesKlas(component, ververs);

    expect(component.bordTelling()).toMatchObject({ ingevuld: 1, open: 0 });
  });

  it('toont een memo die zonder taak is ingevuld als "spontaan"', async () => {
    const { component, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: d => {
        klasMetTweeVakken(d);
        d.memoTW1TW2.set([maakMemoTW12({ vak: VAK, toetsweek: 'TW1' })]);
      },
    });

    await kiesKlas(component, ververs);

    expect(component.bordTelling()).toMatchObject({ spontaan: 1 });
  });

  it('geeft een memo op een niet-gekoppeld vak toch een kolom', async () => {
    // Zonder die aanvulling blijft een spontaan ingevulde memo onzichtbaar.
    const { component, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: d => {
        d.leerlingen.set([maakLeerling()]);
        d.docentVakken.set([maakDocentVak({ vak: VAK })]);
        d.memoTW1TW2.set([maakMemoTW12({ vak: 'Frans', toetsweek: 'TW1' })]);
      },
    });

    await kiesKlas(component, ververs);

    const frans = component.vakKolommen().find(k => k.vak === 'Frans');
    expect(frans?.gekoppeld).toBe(false);
    expect(component.aantalNogUitTeZetten()).toBe(1); // alleen het gekoppelde vak telt mee
  });
});

describe('Mentor: taken uitzetten', () => {
  it('maakt een taak voor elke lege cel', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: klasMetTweeVakken,
    });

    await kiesKlas(component, ververs);
    await component.zetTakenUitVoorKlas();
    await ververs();

    expect(data.docentTaken()).toHaveLength(2);
    expect(data.docentTaken().map(t => t.vak).sort()).toEqual(['Engels', VAK]);
    expect(data.docentTaken().every(t => t.status === 'Open')).toBe(true);
  });

  it('slaat cellen over waar al een taak of memo staat', async () => {
    // Een tweede klik schreef ze eerder opnieuw weg met status Open, waardoor
    // de voortgang van al afgeronde taken werd gewist.
    const { component, data, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: d => {
        klasMetTweeVakken(d);
        d.memoTW1TW2.set([maakMemoTW12({ vak: VAK, toetsweek: 'TW1' })]);
      },
    });

    await kiesKlas(component, ververs);
    await component.zetTakenUitVoorKlas();
    await ververs();

    expect(data.docentTaken().map(t => t.vak)).toEqual(['Engels']);
  });

  it('doet bij een tweede klik niets meer', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: klasMetTweeVakken,
    });

    await kiesKlas(component, ververs);
    await component.zetTakenUitVoorKlas();
    await ververs();
    await component.zetTakenUitVoorKlas();
    await ververs();

    expect(data.docentTaken()).toHaveLength(2);
    expect(component.aantalNogUitTeZetten()).toBe(0);
  });

  it('bundelt openstaande taken per docent voor een herinnering', async () => {
    const { component, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: klasMetTweeVakken,
    });

    await kiesKlas(component, ververs);
    await component.zetTakenUitVoorKlas();
    await ververs();

    const open = component.openstaandeDocenten();
    expect(open.map(d => d.naam).sort()).toEqual([DOCENT.naam, DOCENT2.naam].sort());
    expect(open.every(d => d.taakIds.length === 1)).toBe(true);
  });
});

describe('Mentor: klas op slot', () => {
  it('mag vergrendelen', async () => {
    const { component, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: klasMetTweeVakken,
    });

    await kiesKlas(component, ververs);

    expect(component.magVergrendelen()).toBe(true);
    expect(component.isClassLocked()).toBe(false);
  });

  it('een vakdocent niet', async () => {
    const { component } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Docent',
      vul: klasMetTweeVakken,
    });

    expect(component.magVergrendelen()).toBe(false);
  });

  it('meldt het als het vergrendelen mislukt in plaats van het slot te laten staan', async () => {
    const { component, data, ververs } = await maakOmgeving(MentorOverviewComponent, {
      rol: 'Mentor',
      vul: klasMetTweeVakken,
    });

    await kiesKlas(component, ververs);
    data.volgendeSchrijffout = 'Geen rechten om de klas te sluiten.';
    component.toggleClassLock();
    await ververs();

    expect(component.vergrendelFout() ?? '').toContain('Geen rechten');
  });
});
