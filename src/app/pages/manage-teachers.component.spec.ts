import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManageTeachersComponent } from './manage-teachers.component';
import { maakOmgeving, nepDialogen } from '../../testing/testbed';
import { maakDocent, maakDocentVak } from '../../testing/factories';

let dialogen = nepDialogen();
beforeEach(() => {
  dialogen = nepDialogen(true);
});
afterEach(() => dialogen.herstel());

describe('Koppelingenbeheer (ManageTeachersComponent)', () => {
  it('toont bestaande koppelingen en geeft afkorting in hoofdletters weer', async () => {
    const { component } = await maakOmgeving(ManageTeachersComponent, {
      rol: 'Coordinator',
      vul: d => {
        d.docentVakken.set([
          maakDocentVak({ id: 'dv1', docentNaam: 'Hans Visser', docentAfkorting: 'vis', vak: 'Wiskunde', klas: 'H4A' }),
        ]);
      },
    });

    const lijst = component.filteredDocentVakken();
    expect(lijst).toHaveLength(1);
    expect(lijst[0].docentAfkorting).toBe('vis');
    expect(component.toon(lijst[0].docentAfkorting)).toBe('VIS');
  });

  it('telt koppelingen zonder afkorting en kan daarop filteren', async () => {
    const { component } = await maakOmgeving(ManageTeachersComponent, {
      rol: 'Coordinator',
      vul: d => {
        d.docentVakken.set([
          maakDocentVak({ id: 'dv1', docentNaam: 'Hans Visser', docentAfkorting: 'vis', vak: 'Wiskunde', klas: 'H4A' }),
          maakDocentVak({ id: 'dv2', docentNaam: 'Jansen', docentAfkorting: undefined, vak: 'Nederlands', klas: 'H4A' }),
          maakDocentVak({ id: 'dv3', docentNaam: 'Bakker', docentAfkorting: '', vak: 'Engels', klas: 'H4B' }),
        ]);
      },
    });

    expect(component.aantalZonderAfkorting()).toBe(2);

    component.filterZonderAfkorting.set(true);
    const gefilterd = component.filteredDocentVakken();
    expect(gefilterd).toHaveLength(2);
    expect(gefilterd.map(g => g.docentNaam).sort()).toEqual(['Bakker', 'Jansen']);
  });

  it('zoekt op afkorting, naam, vak of klas', async () => {
    const { component } = await maakOmgeving(ManageTeachersComponent, {
      rol: 'Coordinator',
      vul: d => {
        d.docentVakken.set([
          maakDocentVak({ id: 'dv1', docentNaam: 'Hans Visser', docentAfkorting: 'vis', docentEmail: 'visser@school.nl', vak: 'Wiskunde', klas: 'H4A' }),
          maakDocentVak({ id: 'dv2', docentNaam: 'Pieter Jansen', docentAfkorting: 'jan', docentEmail: 'jansen@school.nl', vak: 'Nederlands', klas: 'H4B' }),
        ]);
      },
    });

    // Zoeken op afkorting (hoofdletters of kleine letters)
    component.searchQuery.set('VIS');
    expect(component.filteredDocentVakken()).toHaveLength(1);
    expect(component.filteredDocentVakken()[0].docentNaam).toBe('Hans Visser');

    component.searchQuery.set('jan');
    expect(component.filteredDocentVakken()).toHaveLength(1);
    expect(component.filteredDocentVakken()[0].docentNaam).toBe('Pieter Jansen');

    // Zoeken op vak
    component.searchQuery.set('wiskunde');
    expect(component.filteredDocentVakken()).toHaveLength(1);

    // Zoeken op klas
    component.searchQuery.set('H4B');
    expect(component.filteredDocentVakken()).toHaveLength(1);
  });

  it('voegt een nieuwe koppeling toe met genormaliseerde docentafkorting', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageTeachersComponent, { rol: 'Coordinator' });

    component.openForm();
    component.form.patchValue({
      docentAfkorting: 'VIS',
      docentNaam: 'Hans Visser',
      docentEmail: 'visser@school.nl',
      vak: 'Wiskunde',
      klas: 'H4A',
    });
    await ververs();

    await component.onSubmit();
    await ververs();

    expect(data.docentVakken()).toHaveLength(1);
    const opgeslagen = data.docentVakken()[0];
    expect(opgeslagen.docentAfkorting).toBe('vis'); // In kleine letters genormaliseerd
    expect(opgeslagen.docentNaam).toBe('Hans Visser');
    expect(opgeslagen.vak).toBe('Wiskunde');
    expect(opgeslagen.klas).toBe('H4A');
    expect(component.showForm()).toBe(false);
  });

  it('weigert een afkorting met ongeldige tekens', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageTeachersComponent, { rol: 'Coordinator' });

    component.openForm();
    component.form.patchValue({
      docentAfkorting: 'V.I.S',
      docentNaam: 'Hans Visser',
      vak: 'Wiskunde',
      klas: 'H4A',
    });
    await ververs();

    await component.onSubmit();
    await ververs();

    expect(component.formAfkortingFout()).not.toBeNull();
    expect(data.docentVakken()).toHaveLength(0);
    expect(component.showForm()).toBe(true);
  });

  it('kan een koppeling opslaan zonder afkorting voor legacy data', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageTeachersComponent, { rol: 'Coordinator' });

    component.openForm();
    component.form.patchValue({
      docentAfkorting: '',
      docentNaam: 'Oude Docent',
      docentEmail: 'oud@school.nl',
      vak: 'Geschiedenis',
      klas: 'H4A',
    });
    await ververs();

    await component.onSubmit();
    await ververs();

    expect(data.docentVakken()).toHaveLength(1);
    expect(data.docentVakken()[0].docentAfkorting).toBeUndefined();
    expect(data.docentVakken()[0].docentNaam).toBe('Oude Docent');
  });

  it('kan een bekende docent kiezen uit docentenbeheer', async () => {
    const { component } = await maakOmgeving(ManageTeachersComponent, {
      rol: 'Coordinator',
      vul: d => {
        d.docenten.set([
          maakDocent({ afkorting: 'vis', naam: 'Hans Visser', actief: true }),
          maakDocent({ afkorting: 'jan', naam: 'Jan Jansen', actief: true }),
        ]);
      },
    });

    component.openForm();
    component.kiesBestaandeDocent('VIS');

    expect(component.form.value.docentAfkorting).toBe('VIS');
    expect(component.form.value.docentNaam).toBe('Hans Visser');
  });

  it('werkt een bestaande koppeling bij via het formulier', async () => {
    const { component, data, ververs } = await maakOmgeving(ManageTeachersComponent, {
      rol: 'Coordinator',
      vul: d => {
        d.docentVakken.set([
          maakDocentVak({ id: 'dv1', docentNaam: 'Hans Visser', docentEmail: 'visser@school.nl', vak: 'Wiskunde', klas: 'H4A' }),
        ]);
      },
    });

    const bestaand = data.docentVakken()[0];
    component.edit(bestaand);

    expect(component.form.value.docentNaam).toBe('Hans Visser');
    expect(component.editingId()).toBe('dv1');

    // Afkorting toevoegen
    component.form.patchValue({ docentAfkorting: 'VIS' });
    await component.onSubmit();
    await ververs();

    const bijgewerkt = data.docentVakken().find(d => d.id === 'dv1');
    expect(bijgewerkt?.docentAfkorting).toBe('vis');
  });

  it('importeert een CSV met afkortingen en vult de koppelingen', async () => {
    const { component, data } = await maakOmgeving(ManageTeachersComponent, {
      rol: 'Coordinator',
      vul: d => {
        d.docenten.set([maakDocent({ afkorting: 'vis', naam: 'Hans Visser' })]);
      },
    });

    const csvInhoud = [
      'docentAfkorting,docentNaam,docentEmail,vak,klas,schooljaar,actief',
      'VIS,Hans Visser,visser@school.nl,Wiskunde,H4A,2026-2027,true',
      'JAN,Jan Jansen,jansen@school.nl,Nederlands,H4B,2026-2027,true',
    ].join('\n');

    const file = new File([csvInhoud], 'koppelingen.csv', { type: 'text/csv' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    component.importCSV(event);

    // Wacht op filereader onload
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(data.docentVakken()).toHaveLength(2);
    expect(data.docentVakken().find(d => d.docentAfkorting === 'vis')).toBeDefined();
    expect(data.docentVakken().find(d => d.docentAfkorting === 'jan')).toBeDefined();
  });

  it('raadt NOOIT een afkorting wanneer deze ontbreekt in de CSV', async () => {
    const { component, data } = await maakOmgeving(ManageTeachersComponent, {
      rol: 'Coordinator',
      vul: d => {
        // Zelfs als Hans Visser in docentenbeheer staat:
        d.docenten.set([maakDocent({ afkorting: 'vis', naam: 'Hans Visser' })]);
      },
    });

    // Legacy CSV zonder afkorting kolom
    const csvInhoud = [
      'docentNaam,docentEmail,vak,klas,schooljaar,actief',
      'Hans Visser,visser@school.nl,Wiskunde,H4A,2026-2027,true',
    ].join('\n');

    const file = new File([csvInhoud], 'legacy.csv', { type: 'text/csv' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    component.importCSV(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(data.docentVakken()).toHaveLength(1);
    // STRIKT: Niet geraden!
    expect(data.docentVakken()[0].docentAfkorting).toBeUndefined();
    expect(data.docentVakken()[0].docentNaam).toBe('Hans Visser');
  });

  it('ontdubbelt regels binnen hetzelfde CSV bestand', async () => {
    const { component, data } = await maakOmgeving(ManageTeachersComponent, { rol: 'Coordinator' });

    const csvInhoud = [
      'docentAfkorting,docentNaam,docentEmail,vak,klas,schooljaar,actief',
      'VIS,Hans Visser,visser@school.nl,Wiskunde,H4A,2026-2027,true',
      'VIS,Hans Visser,visser@school.nl,Wiskunde,H4A,2026-2027,true', // duplicaat
    ].join('\n');

    const file = new File([csvInhoud], 'duplicaten.csv', { type: 'text/csv' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    component.importCSV(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(data.docentVakken()).toHaveLength(1);
  });

  it('overschrijft of actualiseert bestaande koppeling bij herhaalde import', async () => {
    const { component, data } = await maakOmgeving(ManageTeachersComponent, {
      rol: 'Coordinator',
      vul: d => {
        // Reeds bestaande koppeling
        d.docentVakken.set([
          maakDocentVak({ id: 'bestaand-1', docentNaam: 'Hans Visser', docentAfkorting: 'vis', vak: 'Wiskunde', klas: 'H4A', actief: true }),
        ]);
      },
    });

    const csvInhoud = [
      'docentAfkorting,docentNaam,docentEmail,vak,klas,schooljaar,actief',
      'VIS,Hans Visser,visser@school.nl,Wiskunde,H4A,2026-2027,false', // gedeactiveerd
    ].join('\n');

    const file = new File([csvInhoud], 'update.csv', { type: 'text/csv' });
    const event = { target: { files: [file], value: '' } } as unknown as Event;

    component.importCSV(event);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(data.docentVakken()).toHaveLength(1);
    expect(data.docentVakken()[0].id).toBe('bestaand-1');
    expect(data.docentVakken()[0].actief).toBe(false);
  });
});
