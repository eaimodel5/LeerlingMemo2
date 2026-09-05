import { describe, expect, it } from 'vitest';
import {
  analyseerDocentMigratie,
  vindDubbeleDocentAfkortingen,
} from './docent-migratie';

describe('docent-migratie', () => {
  it('vindt dubbele docentafkortingen hoofdletterongevoelig', () => {
    const dubbelen = vindDubbeleDocentAfkortingen([
      {
        afkorting: 'VIS',
        naam: 'Hans Visser',
        actief: true,
      },
      {
        afkorting: 'vis',
        naam: 'Andere Visser',
        actief: true,
      },
      {
        afkorting: 'jan',
        naam: 'Jan Jansen',
        actief: true,
      },
    ]);

    expect(dubbelen).toEqual(['vis']);
  });

  it('is gereed wanneer alle records een bekende docentAfkorting hebben', () => {
    const resultaat = analyseerDocentMigratie(
      [
        {
          afkorting: 'vis',
          naam: 'Hans Visser',
          actief: true,
        },
        {
          afkorting: 'jan',
          naam: 'Jan Jansen',
          actief: true,
        },
      ],
      [
        {
          naam: 'memo',
          records: [
            {
              id: 'memo-1',
              docentAfkorting: 'VIS',
            },
            {
              id: 'memo-2',
              docentAfkorting: 'jan',
            },
          ],
        },
      ],
    );

    expect(resultaat.gereed).toBe(true);
    expect(resultaat.totaalRecords).toBe(2);
    expect(resultaat.metAfkorting).toBe(2);
    expect(resultaat.zonderAfkorting).toBe(0);
    expect(resultaat.onbekendeAfkorting).toBe(0);
    expect(resultaat.dubbeleAfkortingen).toEqual([]);
    expect(resultaat.problemen).toEqual([]);
  });

  it('meldt records zonder docentAfkorting zonder een docent te raden', () => {
    const resultaat = analyseerDocentMigratie(
      [
        {
          afkorting: 'vis',
          naam: 'Hans Visser',
          actief: true,
        },
      ],
      [
        {
          naam: 'docentTaken',
          records: [
            {
              id: 'taak-1',
            },
            {
              id: 'taak-2',
              docentAfkorting: '   ',
            },
          ],
        },
      ],
    );

    expect(resultaat.gereed).toBe(false);
    expect(resultaat.zonderAfkorting).toBe(2);
    expect(resultaat.metAfkorting).toBe(0);

    expect(resultaat.problemen).toEqual([
      {
        collectie: 'docentTaken',
        recordId: 'taak-1',
        soort: 'ontbreekt',
      },
      {
        collectie: 'docentTaken',
        recordId: 'taak-2',
        soort: 'ontbreekt',
      },
    ]);
  });

  it('meldt een onbekende docentAfkorting', () => {
    const resultaat = analyseerDocentMigratie(
      [
        {
          afkorting: 'vis',
          naam: 'Hans Visser',
          actief: true,
        },
      ],
      [
        {
          naam: 'memo',
          records: [
            {
              id: 'memo-1',
              docentAfkorting: 'xyz',
            },
          ],
        },
      ],
    );

    expect(resultaat.gereed).toBe(false);
    expect(resultaat.metAfkorting).toBe(1);
    expect(resultaat.onbekendeAfkorting).toBe(1);

    expect(resultaat.problemen).toEqual([
      {
        collectie: 'memo',
        recordId: 'memo-1',
        soort: 'onbekend',
        docentAfkorting: 'xyz',
      },
    ]);
  });

  it('maakt per collectie een readiness-overzicht', () => {
    const resultaat = analyseerDocentMigratie(
      [
        {
          afkorting: 'vis',
          naam: 'Hans Visser',
          actief: true,
        },
      ],
      [
        {
          naam: 'memo',
          records: [
            {
              id: 'memo-1',
              docentAfkorting: 'vis',
            },
            {
              id: 'memo-2',
            },
          ],
        },
        {
          naam: 'docentTaken',
          records: [
            {
              id: 'taak-1',
              docentAfkorting: 'xyz',
            },
          ],
        },
      ],
    );

    expect(resultaat.collecties).toEqual([
      {
        naam: 'memo',
        totaal: 2,
        metAfkorting: 1,
        zonderAfkorting: 1,
        onbekendeAfkorting: 0,
      },
      {
        naam: 'docentTaken',
        totaal: 1,
        metAfkorting: 1,
        zonderAfkorting: 0,
        onbekendeAfkorting: 1,
      },
    ]);

    expect(resultaat.totaalRecords).toBe(3);
    expect(resultaat.gereed).toBe(false);
  });

  it('blokkeert readiness bij dubbele docentafkortingen', () => {
    const resultaat = analyseerDocentMigratie(
      [
        {
          afkorting: 'vis',
          naam: 'Hans Visser',
          actief: true,
        },
        {
          afkorting: 'VIS',
          naam: 'Tweede Visser',
          actief: true,
        },
      ],
      [],
    );

    expect(resultaat.dubbeleAfkortingen).toEqual([
      'vis',
    ]);
    expect(resultaat.gereed).toBe(false);
  });
});
