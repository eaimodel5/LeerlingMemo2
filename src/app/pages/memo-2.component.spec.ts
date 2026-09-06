import { describe, it, expect } from 'vitest';
import { Memo2Component } from './memo-2.component';
import { maakOmgeving } from '../../testing/testbed';
import {
  DOCENT2,
  KLAS,
  LEERLINGNUMMER,
  SCHOOLJAAR,
  VAK,
  maakDocentVak,
  maakLeerling,
  maakMemoTW12,
} from '../../testing/factories';
import { NepDataService } from '../../testing/nep-dataservice';

function basisgegevens(data: NepDataService) {
  data.leerlingen.set([maakLeerling()]);
  data.docentVakken.set([maakDocentVak()]);
}

describe('Docent: CSV import TW2 docentidentiteit (Fase A5)', () => {
  it('slaat docentAfkorting op bij CSV import TW2 door gebruiker met afkorting', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo2Component, {
      rol: 'Docent',
      gebruiker: { docentAfkorting: 'vis', email: 'visser@school.nl' },
      vul: basisgegevens,
    });

    component.form.patchValue({ schooljaar: SCHOOLJAAR, toetsweek: 'TW2', klas: KLAS });
    component.csvPreviewData.set([{
      leerlingnummer: LEERLINGNUMMER,
      leerling: 'Sam de Vries',
      klas: KLAS,
      vak: VAK,
      aandachtspuntenRaw: '',
      waarZieJeDitAan: 'TW2 observatie.',
      watWerktWel: '',
      leerlingActie: '',
      docentActie: '',
    }]);

    await component.confirmImport();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(1);
    const memo = data.memoTW1TW2()[0];
    expect(memo.docentAfkorting).toBe('vis');
    expect(memo.docentEmail).toBe('visser@school.nl');
    expect(memo.toetsweek).toBe('TW2');
    expect(memo.waarZieJeDitAan).toBe('TW2 observatie.');
  });

  it('blokkeert import en toont foutmelding wanneer ingelogde gebruiker geen docentAfkorting heeft', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo2Component, {
      rol: 'Docent',
      gebruiker: { email: 'visser@school.nl' },
      vul: basisgegevens,
    });

    component.form.patchValue({ schooljaar: SCHOOLJAAR, toetsweek: 'TW2', klas: KLAS });
    component.csvPreviewData.set([{
      leerlingnummer: LEERLINGNUMMER,
      leerling: 'Sam de Vries',
      klas: KLAS,
      vak: VAK,
      aandachtspuntenRaw: '',
      waarZieJeDitAan: 'TW2 observatie.',
      watWerktWel: '',
      leerlingActie: '',
      docentActie: '',
    }]);

    await component.confirmImport();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(0);
    expect(component.melding()?.soort).toBe('fout');
  });

  it('overschrijft een TW2-memo van een collega met hetzelfde vak nooit', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo2Component, {
      rol: 'Docent',
      gebruiker: { docentAfkorting: 'vis', email: 'visser@school.nl' },
      vul: d => {
        basisgegevens(d);
        d.memoTW1TW2.set([
          maakMemoTW12({
            id: 'memo-collega-tw2',
            schooljaar: SCHOOLJAAR,
            toetsweek: 'TW2',
            leerlingnummer: LEERLINGNUMMER,
            vak: VAK,
            docentAfkorting: 'jan',
            docentEmail: DOCENT2.email,
            docentNaam: DOCENT2.naam,
            waarZieJeDitAan: 'TW2 van collega Jansen.',
          }),
        ]);
      },
    });

    component.form.patchValue({ schooljaar: SCHOOLJAAR, toetsweek: 'TW2', klas: KLAS });
    component.csvPreviewData.set([{
      leerlingnummer: LEERLINGNUMMER,
      leerling: 'Sam de Vries',
      klas: KLAS,
      vak: VAK,
      aandachtspuntenRaw: '',
      waarZieJeDitAan: 'TW2 van Visser.',
      watWerktWel: '',
      leerlingActie: '',
      docentActie: '',
    }]);

    await component.confirmImport();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(2);
    const collegaMemo = data.memoTW1TW2().find(m => m.id === 'memo-collega-tw2');
    expect(collegaMemo?.waarZieJeDitAan).toBe('TW2 van collega Jansen.');
    expect(collegaMemo?.docentAfkorting).toBe('jan');

    const eigenMemo = data.memoTW1TW2().find(m => m.id !== 'memo-collega-tw2');
    expect(eigenMemo?.waarZieJeDitAan).toBe('TW2 van Visser.');
    expect(eigenMemo?.docentAfkorting).toBe('vis');
  });

  it('werkt een bestaande eigen TW2-memo bij', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo2Component, {
      rol: 'Docent',
      gebruiker: { docentAfkorting: 'vis', email: 'visser@school.nl' },
      vul: d => {
        basisgegevens(d);
        d.memoTW1TW2.set([
          maakMemoTW12({
            id: 'memo-eigen-tw2',
            schooljaar: SCHOOLJAAR,
            toetsweek: 'TW2',
            leerlingnummer: LEERLINGNUMMER,
            vak: VAK,
            docentAfkorting: 'vis',
            docentEmail: 'visser@school.nl',
            waarZieJeDitAan: 'Oude TW2 tekst.',
          }),
        ]);
      },
    });

    component.form.patchValue({ schooljaar: SCHOOLJAAR, toetsweek: 'TW2', klas: KLAS });
    component.csvPreviewData.set([{
      leerlingnummer: LEERLINGNUMMER,
      leerling: 'Sam de Vries',
      klas: KLAS,
      vak: VAK,
      aandachtspuntenRaw: '',
      waarZieJeDitAan: 'Bijgewerkte TW2 tekst.',
      watWerktWel: '',
      leerlingActie: '',
      docentActie: '',
    }]);

    await component.confirmImport();
    await ververs();

    expect(data.memoTW1TW2()).toHaveLength(1);
    const memo = data.memoTW1TW2()[0];
    expect(memo.id).toBe('memo-eigen-tw2');
    expect(memo.waarZieJeDitAan).toBe('Bijgewerkte TW2 tekst.');
    expect(memo.docentAfkorting).toBe('vis');
  });
});
