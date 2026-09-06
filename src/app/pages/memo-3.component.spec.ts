import { describe, it, expect } from 'vitest';
import { Memo3Component } from './memo-3.component';
import { maakOmgeving } from '../../testing/testbed';
import {
  DOCENT2,
  KLAS,
  LEERLINGNUMMER,
  SCHOOLJAAR,
  VAK,
  maakDocentVak,
  maakLeerling,
  maakMemoTW3,
} from '../../testing/factories';
import { NepDataService } from '../../testing/nep-dataservice';

function basisgegevens(data: NepDataService) {
  data.leerlingen.set([maakLeerling()]);
  data.docentVakken.set([maakDocentVak()]);
}

describe('Docent: CSV import TW3 docentidentiteit (Fase A5)', () => {
  it('slaat docentAfkorting op bij CSV import TW3 door gebruiker met afkorting', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo3Component, {
      rol: 'Docent',
      gebruiker: { docentAfkorting: 'vis', email: 'visser@school.nl' },
      vul: basisgegevens,
    });

    component.form.patchValue({ schooljaar: SCHOOLJAAR, klas: KLAS });
    component.csvPreviewData.set([{
      leerlingnummer: LEERLINGNUMMER,
      leerling: 'Sam de Vries',
      klas: KLAS,
      vak: VAK,
      aandachtspuntenRaw: '',
      waarZieJeDitAan: 'TW3 observatie.',
      watWerktWel: '',
      doorstroomToelichting: 'Gaat over.',
    }]);

    await component.confirmImport();
    await ververs();

    expect(data.memoTW3()).toHaveLength(1);
    const memo = data.memoTW3()[0];
    expect(memo.docentAfkorting).toBe('vis');
    expect(memo.docentEmail).toBe('visser@school.nl');
    expect(memo.toetsweek).toBe('TW3');
    expect(memo.waarZieJeDitAan).toBe('TW3 observatie.');
    expect(memo.doorstroomToelichting).toBe('Gaat over.');
  });

  it('blokkeert import en toont foutmelding wanneer ingelogde gebruiker geen docentAfkorting heeft', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo3Component, {
      rol: 'Docent',
      gebruiker: { email: 'visser@school.nl' },
      vul: basisgegevens,
    });

    component.form.patchValue({ schooljaar: SCHOOLJAAR, klas: KLAS });
    component.csvPreviewData.set([{
      leerlingnummer: LEERLINGNUMMER,
      leerling: 'Sam de Vries',
      klas: KLAS,
      vak: VAK,
      aandachtspuntenRaw: '',
      waarZieJeDitAan: 'TW3 observatie.',
      watWerktWel: '',
      doorstroomToelichting: '',
    }]);

    await component.confirmImport();
    await ververs();

    expect(data.memoTW3()).toHaveLength(0);
    expect(component.melding()?.soort).toBe('fout');
  });

  it('overschrijft een TW3-memo van een collega met hetzelfde vak nooit', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo3Component, {
      rol: 'Docent',
      gebruiker: { docentAfkorting: 'vis', email: 'visser@school.nl' },
      vul: d => {
        basisgegevens(d);
        d.memoTW3.set([
          maakMemoTW3({
            id: 'memo-collega-tw3',
            schooljaar: SCHOOLJAAR,
            toetsweek: 'TW3',
            leerlingnummer: LEERLINGNUMMER,
            vak: VAK,
            docentAfkorting: 'jan',
            docentEmail: DOCENT2.email,
            docentNaam: DOCENT2.naam,
            waarZieJeDitAan: 'TW3 van collega Jansen.',
          }),
        ]);
      },
    });

    component.form.patchValue({ schooljaar: SCHOOLJAAR, klas: KLAS });
    component.csvPreviewData.set([{
      leerlingnummer: LEERLINGNUMMER,
      leerling: 'Sam de Vries',
      klas: KLAS,
      vak: VAK,
      aandachtspuntenRaw: '',
      waarZieJeDitAan: 'TW3 van Visser.',
      watWerktWel: '',
      doorstroomToelichting: '',
    }]);

    await component.confirmImport();
    await ververs();

    expect(data.memoTW3()).toHaveLength(2);
    const collegaMemo = data.memoTW3().find(m => m.id === 'memo-collega-tw3');
    expect(collegaMemo?.waarZieJeDitAan).toBe('TW3 van collega Jansen.');
    expect(collegaMemo?.docentAfkorting).toBe('jan');

    const eigenMemo = data.memoTW3().find(m => m.id !== 'memo-collega-tw3');
    expect(eigenMemo?.waarZieJeDitAan).toBe('TW3 van Visser.');
    expect(eigenMemo?.docentAfkorting).toBe('vis');
  });

  it('werkt een bestaande eigen TW3-memo bij', async () => {
    const { component, data, ververs } = await maakOmgeving(Memo3Component, {
      rol: 'Docent',
      gebruiker: { docentAfkorting: 'vis', email: 'visser@school.nl' },
      vul: d => {
        basisgegevens(d);
        d.memoTW3.set([
          maakMemoTW3({
            id: 'memo-eigen-tw3',
            schooljaar: SCHOOLJAAR,
            toetsweek: 'TW3',
            leerlingnummer: LEERLINGNUMMER,
            vak: VAK,
            docentAfkorting: 'vis',
            docentEmail: 'visser@school.nl',
            waarZieJeDitAan: 'Oude TW3 tekst.',
          }),
        ]);
      },
    });

    component.form.patchValue({ schooljaar: SCHOOLJAAR, klas: KLAS });
    component.csvPreviewData.set([{
      leerlingnummer: LEERLINGNUMMER,
      leerling: 'Sam de Vries',
      klas: KLAS,
      vak: VAK,
      aandachtspuntenRaw: '',
      waarZieJeDitAan: 'Bijgewerkte TW3 tekst.',
      watWerktWel: '',
      doorstroomToelichting: 'Bijgewerkte toelichting.',
    }]);

    await component.confirmImport();
    await ververs();

    expect(data.memoTW3()).toHaveLength(1);
    const memo = data.memoTW3()[0];
    expect(memo.id).toBe('memo-eigen-tw3');
    expect(memo.waarZieJeDitAan).toBe('Bijgewerkte TW3 tekst.');
    expect(memo.doorstroomToelichting).toBe('Bijgewerkte toelichting.');
    expect(memo.docentAfkorting).toBe('vis');
  });
});
