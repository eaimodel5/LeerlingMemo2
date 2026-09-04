import { describe, it, expect } from 'vitest';
import { TeacherDashboardComponent } from './teacher-dashboard.component';
import { maakOmgeving } from '../../testing/testbed';
import { DOCENT, DOCENT2, maakMemoTW12, maakMemoTW3, maakTaak } from '../../testing/factories';

describe('Docent: mijn taken', () => {
  it('toont de taken van de ingelogde docent en niet die van een ander', async () => {
    const { component } = await maakOmgeving(TeacherDashboardComponent, {
      rol: 'Docent',
      vul: data =>
        data.docentTaken.set([
          maakTaak({ id: 'mijn', docentEmail: DOCENT.email }),
          maakTaak({ id: 'ander', docentEmail: DOCENT2.email, docentNaam: DOCENT2.naam }),
        ]),
    });

    expect(component.myTaken().map(t => t.id)).toEqual(['mijn']);
  });

  it('herkent het eigen adres ook met andere hoofdletters', async () => {
    // Het adres uit de toegangscode en het adres uit Docenten/Vakken worden
    // door mensen ingetypt; die hoeven niet letterlijk gelijk te zijn.
    const { component } = await maakOmgeving(TeacherDashboardComponent, {
      rol: 'Docent',
      gebruiker: { email: DOCENT.email.toUpperCase() },
      vul: data => data.docentTaken.set([maakTaak({ docentEmail: ` ${DOCENT.email} ` })]),
    });

    expect(component.myTaken()).toHaveLength(1);
  });

  it('zet een taak pas bij "afgerond" als de memo bestaat', async () => {
    const { component, data, ververs } = await maakOmgeving(TeacherDashboardComponent, {
      rol: 'Docent',
      vul: d => d.docentTaken.set([maakTaak({ id: 'taak', periode: 'TW1' })]),
    });

    expect(component.openTaken().map(t => t.id)).toEqual(['taak']);
    expect(component.closedTaken()).toHaveLength(0);

    data.memoTW1TW2.set([maakMemoTW12({ toetsweek: 'TW1' })]);
    await ververs();

    expect(component.openTaken()).toHaveLength(0);
    expect(component.closedTaken().map(t => t.id)).toEqual(['taak']);
  });

  it('kijkt naar de memo, niet naar het statusveld', async () => {
    // Het statusveld werd alleen bijgewerkt als de docent via de link binnenkwam.
    // Een memo die anders was ingevuld bleef hier eeuwig openstaan.
    const { component } = await maakOmgeving(TeacherDashboardComponent, {
      rol: 'Docent',
      vul: d => {
        d.docentTaken.set([maakTaak({ status: 'Open', periode: 'TW1' })]);
        d.memoTW1TW2.set([maakMemoTW12({ toetsweek: 'TW1' })]);
      },
    });

    expect(component.openTaken()).toHaveLength(0);
  });

  it('houdt de periodes uit elkaar', async () => {
    const { component } = await maakOmgeving(TeacherDashboardComponent, {
      rol: 'Docent',
      vul: d => {
        d.docentTaken.set([maakTaak({ id: 'tw1', periode: 'TW1' }), maakTaak({ id: 'tw2', periode: 'TW2' })]);
        d.memoTW1TW2.set([maakMemoTW12({ toetsweek: 'TW1' })]);
      },
    });

    expect(component.openTaken().map(t => t.id)).toEqual(['tw2']);
  });

  it('telt een TW3-memo mee voor een TW3-taak', async () => {
    const { component } = await maakOmgeving(TeacherDashboardComponent, {
      rol: 'Docent',
      vul: d => {
        d.docentTaken.set([maakTaak({ id: 'tw3', periode: 'TW3' })]);
        d.memoTW3.set([maakMemoTW3()]);
      },
    });

    expect(component.openTaken()).toHaveLength(0);
  });

  it('stuurt per periode naar het juiste memoscherm', async () => {
    const { component } = await maakOmgeving(TeacherDashboardComponent, { rol: 'Docent' });
    expect(component.getMemoRoute('TW1')).toBe('/memo-1');
    expect(component.getMemoRoute('TW2')).toBe('/memo-2');
    expect(component.getMemoRoute('TW3')).toBe('/memo-3');
  });
});
