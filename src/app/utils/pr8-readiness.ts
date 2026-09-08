import { AccessCode, Leerling } from '../models/data.models';
import { normaliseerAfkorting } from './docent-afkorting';
import { vindDubbeleDocentAfkortingen } from './docent-migratie';
import { analyseerAccessCodeMigratie } from './toegangscode';

export type PR8BlokkadeOnderdeel =
  | 'dubbele-docenten'
  | 'docent-vakken'
  | 'docent-taken'
  | 'memo-tw1tw2'
  | 'memo-tw3'
  | 'toegangscodes'
  | 'leerling-mentoren';

export interface PR8ProbleemItem {
  id: string;
  titel: string;
  detail: string;
  soort: 'ontbreekt' | 'onbekend' | 'dubbel';
  afkorting?: string;
}

export interface PR8OnderdeelStatus {
  onderdeel: PR8BlokkadeOnderdeel;
  titel: string;
  totaal: number;
  inOrde: number;
  problemen: number;
  probleemItems: PR8ProbleemItem[];
  herstelRoute: string;
  herstelLabel: string;
}

export interface PR8ReadinessRapport {
  gereed: boolean;
  totaalProblemen: number;
  onderdelen: Record<PR8BlokkadeOnderdeel, PR8OnderdeelStatus>;
  alleProblemen: (PR8ProbleemItem & { onderdeel: PR8BlokkadeOnderdeel; herstelRoute: string })[];
}

export interface PR8ReadinessInvoer {
  docenten: readonly { afkorting: string; naam?: string; actief?: boolean }[];
  docentVakken: readonly { id?: string; docentNaam?: string; docentAfkorting?: string; vak?: string; klas?: string }[];
  docentTaken: readonly { id?: string; docentNaam?: string; docentAfkorting?: string; vak?: string; klas?: string }[];
  memoTW1TW2: readonly { id?: string; docentNaam?: string; docentAfkorting?: string; vak?: string; klas?: string }[];
  memoTW3: readonly { id?: string; docentNaam?: string; docentAfkorting?: string; vak?: string; klas?: string }[];
  toegangscodes: readonly AccessCode[];
  leerlingen: readonly Leerling[];
}

/**
 * Voert een deterministische en volledige PR8-readiness controle uit over alle
 * zeven vereiste onderdelen voor de latere PR9-cutover:
 *
 * 1. Dubbele canonieke docentafkortingen in /docenten
 * 2. Docenten/Vakken zonder canonieke docentafkorting
 * 3. DocentTaken zonder canonieke docentafkorting
 * 4. Memo TW1/TW2 met onbekende auteur / zonder docentafkorting
 * 5. Memo TW3 met onbekende auteur / zonder docentafkorting
 * 6. Relevante toegangscodes zonder geldige canonieke docentAfkorting
 * 7. Leerlingen met mentorrelatie zonder geldige canonieke mentorAfkorting
 *
 * Geen enkele afleiding op naam of e-mail; alles rust op de canonieke afkorting.
 */
export function controleerPR8Readiness(invoer: PR8ReadinessInvoer): PR8ReadinessRapport {
  const bekendeAfkortingen = new Set(
    invoer.docenten
      .map(d => normaliseerAfkorting(d.afkorting))
      .filter(Boolean),
  );

  // 1. Dubbele canonieke docentafkortingen
  const dubbeleAfk = vindDubbeleDocentAfkortingen(
    invoer.docenten.map(d => ({
      afkorting: d.afkorting,
      naam: d.naam || '',
      actief: d.actief ?? true,
    })),
  );
  const dubbeleProblemen: PR8ProbleemItem[] = dubbeleAfk.map(afk => ({
    id: `docent:${afk}`,
    titel: `Dubbele afkorting: ${afk.toUpperCase()}`,
    detail: `De afkorting "${afk}" komt meermaals voor in het docentenbestand.`,
    soort: 'dubbel',
    afkorting: afk,
  }));

  const dubbeleStatus: PR8OnderdeelStatus = {
    onderdeel: 'dubbele-docenten',
    titel: 'Unieke docentafkortingen',
    totaal: invoer.docenten.length,
    inOrde: invoer.docenten.length - dubbeleProblemen.length,
    problemen: dubbeleProblemen.length,
    probleemItems: dubbeleProblemen,
    herstelRoute: '/manage-docenten',
    herstelLabel: 'Beheer docenten',
  };

  // Helper voor gekoppelde records (DocentVakken, Taken, Memo's)
  function controleerGekoppeldeCollectie(
    items: readonly { id?: string; docentNaam?: string; docentAfkorting?: string; vak?: string; klas?: string }[],
    onderdeel: PR8BlokkadeOnderdeel,
    titel: string,
    label: string,
  ): PR8OnderdeelStatus {
    const probleemItems: PR8ProbleemItem[] = [];
    let inOrde = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const id = item.id || `${onderdeel}:${i}`;
      const rawAfk = item.docentAfkorting?.trim();
      const normAfk = rawAfk ? normaliseerAfkorting(rawAfk) : '';
      const omschrijving = [item.docentNaam, item.vak, item.klas].filter(Boolean).join(' — ') || id;

      if (!normAfk) {
        probleemItems.push({
          id,
          titel: `${titel}: ${omschrijving}`,
          detail: 'Heeft geen canonieke docentafkorting.',
          soort: 'ontbreekt',
        });
      } else if (!bekendeAfkortingen.has(normAfk)) {
        probleemItems.push({
          id,
          titel: `${titel}: ${omschrijving}`,
          detail: `Docentafkorting "${normAfk}" is onbekend in het docentenbestand.`,
          soort: 'onbekend',
          afkorting: normAfk,
        });
      } else {
        inOrde++;
      }
    }

    return {
      onderdeel,
      titel,
      totaal: items.length,
      inOrde,
      problemen: probleemItems.length,
      probleemItems,
      herstelRoute: '/manage-docenten',
      herstelLabel: label,
    };
  }

  // 2. Docenten/Vakken
  const docentVakkenStatus = controleerGekoppeldeCollectie(
    invoer.docentVakken,
    'docent-vakken',
    'Docent/Vak-koppeling',
    'Koppel docenten/vakken',
  );

  // 3. DocentTaken
  const docentTakenStatus = controleerGekoppeldeCollectie(
    invoer.docentTaken,
    'docent-taken',
    'Docenttaak',
    'Herstel docenttaken',
  );

  // 4. Memo TW1/TW2
  const memoTW1TW2Status = controleerGekoppeldeCollectie(
    invoer.memoTW1TW2,
    'memo-tw1tw2',
    'Memo TW1/TW2',
    'Herstel auteurs TW1/TW2',
  );

  // 5. Memo TW3
  const memoTW3Status = controleerGekoppeldeCollectie(
    invoer.memoTW3,
    'memo-tw3',
    'Memo TW3',
    'Herstel auteurs TW3',
  );

  // 6. Toegangscodes
  const codeMigratie = analyseerAccessCodeMigratie(invoer.toegangscodes, invoer.docenten);
  const codeProblemen: PR8ProbleemItem[] = codeMigratie.probleemGevallen.map(p => ({
    id: p.codeId,
    titel: `Toegangscode ${p.code} (${p.role})`,
    detail: p.soort === 'ontbreekt'
      ? `Eigenaar: ${p.ownerName} (${p.ownerEmail}). Heeft nog geen gekoppelde canonieke docentafkorting.`
      : `Eigenaar: ${p.ownerName}. Gekoppelde afkorting "${p.docentAfkorting}" is onbekend.`,
    soort: p.soort,
    afkorting: p.docentAfkorting,
  }));

  const toegangscodesStatus: PR8OnderdeelStatus = {
    onderdeel: 'toegangscodes',
    titel: 'Relevante toegangscodes',
    totaal: codeMigratie.totaal,
    inOrde: codeMigratie.metAfkorting,
    problemen: codeProblemen.length,
    probleemItems: codeProblemen,
    herstelRoute: '/superuser',
    herstelLabel: 'Beheer toegangscodes',
  };

  // 7. Leerlingen met mentorrelatie
  const leerlingProblemen: PR8ProbleemItem[] = [];
  let leerlingenMetMentor = 0;
  let leerlingenMentorInOrde = 0;

  for (const l of invoer.leerlingen) {
    const heeftMentorRelatie = Boolean(
      (l.mentorNaam && l.mentorNaam.trim()) ||
      (l.mentorEmail && l.mentorEmail.trim()) ||
      (l.mentorAfkorting && l.mentorAfkorting.trim()),
    );

    if (!heeftMentorRelatie) {
      continue;
    }

    leerlingenMetMentor++;
    const rawAfk = l.mentorAfkorting?.trim();
    const normAfk = rawAfk ? normaliseerAfkorting(rawAfk) : '';
    const id = l.id || l.leerlingnummer;
    const llnLabel = `${l.leerling} (${l.leerlingnummer}, klas ${l.klas})`;

    if (!normAfk) {
      leerlingProblemen.push({
        id,
        titel: llnLabel,
        detail: `Heeft mentorrelatie (${l.mentorNaam || l.mentorEmail || 'naamloos'}), maar nog geen canonieke mentorAfkorting.`,
        soort: 'ontbreekt',
      });
    } else if (!bekendeAfkortingen.has(normAfk)) {
      leerlingProblemen.push({
        id,
        titel: llnLabel,
        detail: `Canonieke mentorAfkorting "${normAfk}" is onbekend in het docentenbestand.`,
        soort: 'onbekend',
        afkorting: normAfk,
      });
    } else {
      leerlingenMentorInOrde++;
    }
  }

  const leerlingStatus: PR8OnderdeelStatus = {
    onderdeel: 'leerling-mentoren',
    titel: 'Leerling-mentorrelaties',
    totaal: leerlingenMetMentor,
    inOrde: leerlingenMentorInOrde,
    problemen: leerlingProblemen.length,
    probleemItems: leerlingProblemen,
    herstelRoute: '/manage-students',
    herstelLabel: 'Beheer leerlingen',
  };

  const onderdelen: Record<PR8BlokkadeOnderdeel, PR8OnderdeelStatus> = {
    'dubbele-docenten': dubbeleStatus,
    'docent-vakken': docentVakkenStatus,
    'docent-taken': docentTakenStatus,
    'memo-tw1tw2': memoTW1TW2Status,
    'memo-tw3': memoTW3Status,
    'toegangscodes': toegangscodesStatus,
    'leerling-mentoren': leerlingStatus,
  };

  const alleProblemen: (PR8ProbleemItem & { onderdeel: PR8BlokkadeOnderdeel; herstelRoute: string })[] = [];
  let totaalProblemen = 0;

  for (const o of Object.values(onderdelen)) {
    totaalProblemen += o.problemen;
    for (const p of o.probleemItems) {
      alleProblemen.push({
        ...p,
        onderdeel: o.onderdeel,
        herstelRoute: o.herstelRoute,
      });
    }
  }

  return {
    gereed: totaalProblemen === 0,
    totaalProblemen,
    onderdelen,
    alleProblemen,
  };
}
