import { describe, it, expect } from 'vitest';
import { MagisterExportComponent } from './magister-export.component';
import { maakOmgeving } from '../../testing/testbed';
import {
  DOCENT,
  KLAS,
  LEERLINGNUMMER,
  VAK,
  maakLeerling,
  maakMemoTW12,
  maakMemoTW3,
  maakVoorbereiding,
  maakVoortgangsplan,
} from '../../testing/factories';
import { NepDataService } from '../../testing/nep-dataservice';

function volledigDossier(data: NepDataService) {
  data.leerlingen.set([maakLeerling()]);
  data.memoTW1TW2.set([maakMemoTW12({ toetsweek: 'TW1' })]);
  data.mentorVoorbereiding.set([maakVoorbereiding({ periode: 'TW1' })]);
  data.voortgangsplan.set([maakVoortgangsplan({ periode: 'TW1' })]);
}

async function kiesLeerling(component: MagisterExportComponent, ververs: () => Promise<void>) {
  component.klas.set(KLAS);
  component.leerlingnummer.set(LEERLINGNUMMER);
  await ververs();
}

describe('Mentor: Magister-export', () => {
  it('zet de memo van een vakdocent in de tekst', async () => {
    const { component, ververs } = await maakOmgeving(MagisterExportComponent, {
      rol: 'Mentor',
      vul: volledigDossier,
    });

    await kiesLeerling(component, ververs);
    const tekst = component.generatedText();

    expect(tekst).toContain('Sam de Vries');
    expect(tekst).toContain(`[${VAK}] - ${DOCENT.naam}`);
    expect(tekst).toContain('Levert het huiswerk vaak te laat in.');
  });

  it('gebruikt echte regeleinden, geen letterlijke backslash-n', async () => {
    // In de broncode stond '\\n' waar '\n' bedoeld was; de hele export kwam er
    // als een doorlopende regel uit met zichtbare \n-tekens ertussen.
    const { component, ververs } = await maakOmgeving(MagisterExportComponent, {
      rol: 'Mentor',
      vul: volledigDossier,
    });

    await kiesLeerling(component, ververs);
    const tekst = component.generatedText();

    expect(tekst).not.toContain('\\n');
    expect(tekst.split('\n').length).toBeGreaterThan(5);
  });

  it('meldt het als er geen memo is in plaats van een lege tekst te geven', async () => {
    const { component, ververs } = await maakOmgeving(MagisterExportComponent, {
      rol: 'Mentor',
      vul: d => d.leerlingen.set([maakLeerling()]),
    });

    await kiesLeerling(component, ververs);

    expect(component.generatedText()).toContain("Geen memo's gevonden");
  });

  it('neemt bij het volledige overzicht ook voorbereiding en plan mee', async () => {
    const { component, ververs } = await maakOmgeving(MagisterExportComponent, {
      rol: 'Mentor',
      vul: volledigDossier,
    });

    await kiesLeerling(component, ververs);
    component.typeExport.set('full');
    await ververs();
    const tekst = component.generatedText();

    expect(tekst).toContain('VOORBEREIDING RAPPORTVERGADERING');
    expect(tekst).toContain('Hoe krijgen we de planning op orde?');
    expect(tekst).toContain('Planning is het grootste knelpunt.');
  });

  it('toont in TW3 de doorstroomtoelichting in plaats van de acties', async () => {
    const { component, ververs } = await maakOmgeving(MagisterExportComponent, {
      rol: 'Mentor',
      vul: d => {
        d.leerlingen.set([maakLeerling()]);
        d.memoTW3.set([maakMemoTW3()]);
      },
    });

    await kiesLeerling(component, ververs);
    component.periode.set('TW3');
    await ververs();
    const tekst = component.generatedText();

    expect(tekst).toContain('Doorstroomtoelichting');
    expect(tekst).toContain('Bevordering is haalbaar met inzet op planning.');
    expect(tekst).not.toContain('Actie leerling');
  });

  it('exporteert de hele klas in een keer, met een kop per leerling', async () => {
    const { component, ververs } = await maakOmgeving(MagisterExportComponent, {
      rol: 'Mentor',
      vul: d => {
        d.leerlingen.set([
          maakLeerling({ id: 'a', leerlingnummer: '111111', leerling: 'Ali Yilmaz' }),
          maakLeerling({ id: 'b', leerlingnummer: '222222', leerling: 'Bo Jansen' }),
        ]);
        d.memoTW1TW2.set([
          maakMemoTW12({ id: 'm1', leerlingnummer: '111111', leerling: 'Ali Yilmaz' }),
          maakMemoTW12({ id: 'm2', leerlingnummer: '222222', leerling: 'Bo Jansen' }),
        ]);
      },
    });

    component.klas.set(KLAS);
    await ververs();

    expect(component.aantalInKlasExport()).toBe(2);
    const tekst = component.klasTekst();
    expect(tekst).toContain('1. Ali Yilmaz (111111)');
    expect(tekst).toContain('2. Bo Jansen (222222)');
    expect(tekst).toContain('KLAS H4A');
  });

  it('slaat leerlingen zonder gegevens over als dat is aangevinkt', async () => {
    const { component, ververs } = await maakOmgeving(MagisterExportComponent, {
      rol: 'Mentor',
      vul: d => {
        d.leerlingen.set([
          maakLeerling({ id: 'a', leerlingnummer: '111111', leerling: 'Ali Yilmaz' }),
          maakLeerling({ id: 'b', leerlingnummer: '222222', leerling: 'Bo Jansen' }),
        ]);
        d.memoTW1TW2.set([maakMemoTW12({ leerlingnummer: '111111', leerling: 'Ali Yilmaz' })]);
      },
    });

    component.klas.set(KLAS);
    await ververs();

    expect(component.alleenMetGegevens()).toBe(true);
    expect(component.aantalInKlasExport()).toBe(1);

    component.alleenMetGegevens.set(false);
    await ververs();

    expect(component.aantalInKlasExport()).toBe(2);
  });
});
