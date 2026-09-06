import { describe, expect, it } from 'vitest';
import { NepDataService } from './nep-dataservice';
import { DocentTaak } from '../app/models/data.models';

function taak(over: Partial<DocentTaak> = {}): DocentTaak {
  return {
    id: 'taak-1',
    schooljaar: '2026-2027',
    periode: 'TW1',
    klas: '5V',
    leerlingnummer: '12345',
    leerling: 'Leerling Test',
    docentEmail: 'oud@school.nl',
    docentNaam: 'Hans Visser',
    docentAfkorting: 'vis',
    vak: 'Wiskunde',
    mentorEmail: 'mentor@school.nl',
    status: 'Open',
    aangemaaktOp: '2026-09-05T12:00:00.000Z',
    gewijzigdOp: '2026-09-05T12:00:00.000Z',
    ...over,
  };
}

describe('NepDataService.saveDocentTaak docentidentiteit', () => {
  it('update dezelfde moderne docent op afkorting, ook als het legacy-e-mailadres verandert', async () => {
    const data = new NepDataService();
    data.docentTaken.set([taak()]);

    await data.saveDocentTaak({
      leerlingnummer: '12345',
      docentEmail: 'nieuw@school.nl',
      docentAfkorting: 'VIS',
      periode: 'TW1',
      schooljaar: '2026-2027',
      status: 'Ingevuld',
    });

    expect(data.docentTaken()).toHaveLength(1);
    expect(data.docentTaken()[0].id).toBe('taak-1');
    expect(data.docentTaken()[0].docentEmail).toBe('nieuw@school.nl');
    expect(data.schrijfacties.at(-1)).toEqual({
      actie: 'saveDocentTaak:update',
      id: 'taak-1',
    });
  });

  it('kan tijdens de overgang een legacytaak op hetzelfde e-mailadres bijwerken', async () => {
    const data = new NepDataService();
    data.docentTaken.set([
      taak({
        docentAfkorting: undefined,
        docentEmail: 'visser@school.nl',
      }),
    ]);

    await data.saveDocentTaak({
      leerlingnummer: '12345',
      docentEmail: 'VISSER@SCHOOL.NL',
      docentAfkorting: 'vis',
      periode: 'TW1',
      schooljaar: '2026-2027',
      status: 'Ingevuld',
    });

    expect(data.docentTaken()).toHaveLength(1);
    expect(data.docentTaken()[0].id).toBe('taak-1');
    expect(data.docentTaken()[0].docentAfkorting).toBe('vis');
  });

  it('maakt geen match op naam alleen', async () => {
    const data = new NepDataService();
    data.docentTaken.set([
      taak({
        docentAfkorting: undefined,
        docentEmail: 'eerste@school.nl',
        docentNaam: 'Hans Visser',
      }),
    ]);

    await data.saveDocentTaak({
      leerlingnummer: '12345',
      docentEmail: 'andere@school.nl',
      periode: 'TW1',
      schooljaar: '2026-2027',
      docentNaam: 'Hans Visser',
      status: 'Open',
    });

    expect(data.docentTaken()).toHaveLength(2);
    expect(data.schrijfacties.at(-1)?.actie).toBe('saveDocentTaak:create');
  });
});

describe('NepDataService.updateDocentTaak', () => {
  it('werkt uitsluitend via document-ID en past velden gedeeltelijk aan', async () => {
    const data = new NepDataService();
    const taak1 = taak({ id: 'taak-1', docentAfkorting: undefined, docentEmail: 'oud@school.nl', status: 'Open' });
    const taak2 = taak({ id: 'taak-2', docentAfkorting: 'jan', docentEmail: 'jan@school.nl', status: 'Ingevuld' });
    data.docentTaken.set([taak1, taak2]);

    await data.updateDocentTaak('taak-1', {
      docentAfkorting: 'vis',
      status: 'Ingevuld',
    });

    expect(data.docentTaken()).toHaveLength(2);
    const geupdate = data.docentTaken().find(t => t.id === 'taak-1');
    expect(geupdate).toBeDefined();
    expect(geupdate?.docentAfkorting).toBe('vis');
    expect(geupdate?.status).toBe('Ingevuld');
    // Onveranderde velden blijven exact intact (inclusief legacy-e-mail):
    expect(geupdate?.docentEmail).toBe('oud@school.nl');
    expect(geupdate?.leerlingnummer).toBe('12345');
    expect(geupdate?.vak).toBe('Wiskunde');

    // Andere taak blijft onaangeraakt:
    const onaangeraakt = data.docentTaken().find(t => t.id === 'taak-2');
    expect(onaangeraakt).toEqual(taak2);
  });

  it('registreert de actie in de schrijfacties met het document-ID', async () => {
    const data = new NepDataService();
    data.docentTaken.set([taak({ id: 'taak-abc' })]);

    await data.updateDocentTaak('taak-abc', {
      docentAfkorting: 'vis',
    });

    expect(data.schrijfacties.at(-1)).toEqual({
      actie: 'updateDocentTaak',
      id: 'taak-abc',
    });
  });

  it('raadt geen identiteit en raakt niets aan bij een onbekend document-ID', async () => {
    const data = new NepDataService();
    const bestaand = taak({ id: 'taak-1', docentAfkorting: undefined, docentEmail: 'oud@school.nl' });
    data.docentTaken.set([bestaand]);

    await data.updateDocentTaak('onbekend-id', {
      docentAfkorting: 'vis',
    });

    expect(data.docentTaken()).toHaveLength(1);
    expect(data.docentTaken()[0]).toEqual(bestaand);
    expect(data.schrijfacties.at(-1)).toEqual({
      actie: 'updateDocentTaak',
      id: 'onbekend-id',
    });
  });

  it('gooit een fout als volgendeSchrijffout gezet is', async () => {
    const data = new NepDataService();
    data.docentTaken.set([taak({ id: 'taak-1' })]);
    data.volgendeSchrijffout = 'Netwerkfout';

    await expect(
      data.updateDocentTaak('taak-1', { docentAfkorting: 'vis' }),
    ).rejects.toThrow('Netwerkfout');
  });
});
