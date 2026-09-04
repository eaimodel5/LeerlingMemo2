import { describe, it, expect } from 'vitest';
import { ProgressPlanComponent } from './progress-plan.component';
import { maakOmgeving } from '../../testing/testbed';
import {
  KLAS,
  LEERLINGNUMMER,
  SCHOOLJAAR,
  maakLeerling,
  maakVoortgangsplan,
} from '../../testing/factories';
import { NepDataService } from '../../testing/nep-dataservice';

function basisgegevens(data: NepDataService) {
  data.leerlingen.set([maakLeerling()]);
}

async function kiesLeerling(
  component: ProgressPlanComponent,
  ververs: () => Promise<void>,
  periode: 'TW1' | 'TW2' | 'TW3' = 'TW1',
) {
  component.form.patchValue({ klas: KLAS, leerlingnummer: LEERLINGNUMMER, periode });
  await ververs();
}

describe('Mentor: voortgangsplan opslaan', () => {
  it('slaat een nieuw plan op', async () => {
    const { component, data, ververs } = await maakOmgeving(ProgressPlanComponent, {
      rol: 'Mentor',
      vul: basisgegevens,
    });

    await kiesLeerling(component, ververs);
    component.form.patchValue({
      gezamenlijkeConclusie: 'Planning is het knelpunt.',
      afspraakLeerling1: 'Maakt een dagplanning.',
    });
    await ververs();
    await component.submitFinal();
    await ververs();

    expect(data.voortgangsplan()).toHaveLength(1);
    const plan = data.voortgangsplan()[0];
    expect(plan.leerlingnummer).toBe(LEERLINGNUMMER);
    expect(plan.periode).toBe('TW1');
    expect(plan.schooljaar).toBe(SCHOOLJAAR);
    expect(plan.status).toBe('Definitief');
    expect(plan.gezamenlijkeConclusie).toBe('Planning is het knelpunt.');
    expect(plan.afspraakLeerling1).toBe('Maakt een dagplanning.');
  });

  it('laadt een bestaand plan in plaats van een leeg formulier te tonen', async () => {
    const { component, ververs } = await maakOmgeving(ProgressPlanComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.voortgangsplan.set([maakVoortgangsplan({ gezamenlijkeConclusie: 'Eerder vastgelegd.' })]);
      },
    });

    await kiesLeerling(component, ververs);

    expect(component.form.value.gezamenlijkeConclusie).toBe('Eerder vastgelegd.');
  });

  it('werkt een bestaand plan bij in plaats van er een tweede naast te zetten', async () => {
    const { component, data, ververs } = await maakOmgeving(ProgressPlanComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.voortgangsplan.set([maakVoortgangsplan({ id: 'bestaand', status: 'Concept' })]);
      },
    });

    await kiesLeerling(component, ververs);
    component.form.patchValue({ terugkoppelingOuders: 'Besproken op 12 november.' });
    await ververs();
    await component.submitFinal();
    await ververs();

    expect(data.voortgangsplan()).toHaveLength(1);
    expect(data.voortgangsplan()[0].id).toBe('bestaand');
    expect(data.voortgangsplan()[0].terugkoppelingOuders).toBe('Besproken op 12 november.');
  });

  it('houdt de periodes uit elkaar', async () => {
    const { component, data, ververs } = await maakOmgeving(ProgressPlanComponent, {
      rol: 'Mentor',
      vul: d => {
        basisgegevens(d);
        d.voortgangsplan.set([maakVoortgangsplan({ periode: 'TW1' })]);
      },
    });

    await kiesLeerling(component, ververs, 'TW2');
    component.form.patchValue({ gezamenlijkeConclusie: 'Voor TW2.' });
    await ververs();
    await component.submitFinal();
    await ververs();

    expect(data.voortgangsplan()).toHaveLength(2);
  });

  it('slaat niets op zonder gekozen leerling', async () => {
    const { component, data, ververs } = await maakOmgeving(ProgressPlanComponent, {
      rol: 'Mentor',
      vul: basisgegevens,
    });

    await component.submitFinal();
    await ververs();

    expect(data.voortgangsplan()).toHaveLength(0);
  });

  it('meldt het als de opslag mislukt', async () => {
    const { component, data, ververs } = await maakOmgeving(ProgressPlanComponent, {
      rol: 'Mentor',
      vul: basisgegevens,
    });

    await kiesLeerling(component, ververs);
    data.volgendeSchrijffout = 'Geen verbinding.';
    await component.submitFinal();
    await ververs();

    expect(component.melding()?.soort).toBe('fout');
  });

  for (const rol of ['Coordinator', 'Superuser'] as const) {
    it(`${rol} kan ook een plan opslaan`, async () => {
      const { component, data, ververs } = await maakOmgeving(ProgressPlanComponent, {
        rol,
        vul: basisgegevens,
      });

      await kiesLeerling(component, ververs);
      await component.submitDraft();
      await ververs();

      expect(data.voortgangsplan()).toHaveLength(1);
      expect(data.voortgangsplan()[0].status).toBe('Concept');
    });
  }
});
