export interface DocentMigratieDocent {
  afkorting: string;
  naam: string;
  actief: boolean;
}

export interface DocentMigratieRecord {
  id: string;
  docentAfkorting?: string | null;
}

export interface DocentMigratieCollectie {
  naam: string;
  records: readonly DocentMigratieRecord[];
}

export interface DocentMigratieProbleem {
  collectie: string;
  recordId: string;
  soort: 'ontbreekt' | 'onbekend';
  docentAfkorting?: string;
}

export interface DocentMigratieCollectieStatus {
  naam: string;
  totaal: number;
  metAfkorting: number;
  zonderAfkorting: number;
  onbekendeAfkorting: number;
}

export interface DocentMigratieAnalyse {
  totaalRecords: number;
  metAfkorting: number;
  zonderAfkorting: number;
  onbekendeAfkorting: number;
  dubbeleAfkortingen: string[];
  collecties: DocentMigratieCollectieStatus[];
  problemen: DocentMigratieProbleem[];
  gereed: boolean;
}

function normaliseerAfkorting(
  waarde: string | null | undefined,
): string {
  return waarde?.trim().toLowerCase() ?? '';
}

export function vindDubbeleDocentAfkortingen(
  docenten: readonly DocentMigratieDocent[],
): string[] {
  const aantallen = new Map<string, number>();

  for (const docent of docenten) {
    const afkorting = normaliseerAfkorting(
      docent.afkorting,
    );

    if (!afkorting) {
      continue;
    }

    aantallen.set(
      afkorting,
      (aantallen.get(afkorting) ?? 0) + 1,
    );
  }

  return [...aantallen.entries()]
    .filter(([, aantal]) => aantal > 1)
    .map(([afkorting]) => afkorting)
    .sort();
}

export function analyseerDocentMigratie(
  docenten: readonly DocentMigratieDocent[],
  collecties: readonly DocentMigratieCollectie[],
): DocentMigratieAnalyse {
  const bekendeAfkortingen = new Set(
    docenten
      .map(docent =>
        normaliseerAfkorting(docent.afkorting),
      )
      .filter(Boolean),
  );

  const dubbeleAfkortingen =
    vindDubbeleDocentAfkortingen(docenten);

  const problemen: DocentMigratieProbleem[] = [];
  const collectieStatussen: DocentMigratieCollectieStatus[] = [];

  let totaalRecords = 0;
  let metAfkorting = 0;
  let zonderAfkorting = 0;
  let onbekendeAfkorting = 0;

  for (const collectie of collecties) {
    let collectieMetAfkorting = 0;
    let collectieZonderAfkorting = 0;
    let collectieOnbekendeAfkorting = 0;

    for (const record of collectie.records) {
      totaalRecords += 1;

      const afkorting = normaliseerAfkorting(
        record.docentAfkorting,
      );

      if (!afkorting) {
        zonderAfkorting += 1;
        collectieZonderAfkorting += 1;

        problemen.push({
          collectie: collectie.naam,
          recordId: record.id,
          soort: 'ontbreekt',
        });

        continue;
      }

      metAfkorting += 1;
      collectieMetAfkorting += 1;

      if (!bekendeAfkortingen.has(afkorting)) {
        onbekendeAfkorting += 1;
        collectieOnbekendeAfkorting += 1;

        problemen.push({
          collectie: collectie.naam,
          recordId: record.id,
          soort: 'onbekend',
          docentAfkorting: afkorting,
        });
      }
    }

    collectieStatussen.push({
      naam: collectie.naam,
      totaal: collectie.records.length,
      metAfkorting: collectieMetAfkorting,
      zonderAfkorting: collectieZonderAfkorting,
      onbekendeAfkorting:
        collectieOnbekendeAfkorting,
    });
  }

  return {
    totaalRecords,
    metAfkorting,
    zonderAfkorting,
    onbekendeAfkorting,
    dubbeleAfkortingen,
    collecties: collectieStatussen,
    problemen,
    gereed:
      zonderAfkorting === 0 &&
      onbekendeAfkorting === 0 &&
      dubbeleAfkortingen.length === 0,
  };
}
