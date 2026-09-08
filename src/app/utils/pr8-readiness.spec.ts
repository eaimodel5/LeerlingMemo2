import { describe, it, expect } from 'vitest';
import { controleerPR8Readiness } from './pr8-readiness';
import { AccessCode, Leerling } from '../models/data.models';

interface MutablePR8Invoer {
  docenten: { afkorting: string; naam?: string; actief?: boolean }[];
  docentVakken: { id?: string; docentNaam?: string; docentAfkorting?: string; vak?: string; klas?: string }[];
  docentTaken: { id?: string; docentNaam?: string; docentAfkorting?: string; vak?: string; klas?: string }[];
  memoTW1TW2: { id?: string; docentNaam?: string; docentAfkorting?: string; vak?: string; klas?: string }[];
  memoTW3: { id?: string; docentNaam?: string; docentAfkorting?: string; vak?: string; klas?: string }[];
  toegangscodes: AccessCode[];
  leerlingen: Leerling[];
}

function schoneInvoer(): MutablePR8Invoer {
  return {
    docenten: [
      { afkorting: 'vis', naam: 'Hans Visser', actief: true },
      { afkorting: 'kar', naam: 'Rumeysa Karaarslan', actief: true },
      { afkorting: 'bak', naam: 'Sophie Bakker', actief: true },
    ],
    docentVakken: [
      { id: 'dv1', docentNaam: 'Hans Visser', docentAfkorting: 'vis', vak: 'Wiskunde', klas: '2A' },
      { id: 'dv2', docentNaam: 'Rumeysa Karaarslan', docentAfkorting: 'kar', vak: 'Nederlands', klas: '2HJ' },
    ],
    docentTaken: [
      { id: 'dt1', docentNaam: 'Hans Visser', docentAfkorting: 'vis', vak: 'Wiskunde', klas: '2A' },
    ],
    memoTW1TW2: [
      { id: 'm1', docentNaam: 'Sophie Bakker', docentAfkorting: 'bak', vak: 'Engels', klas: '2A' },
    ],
    memoTW3: [
      { id: 'm2', docentNaam: 'Hans Visser', docentAfkorting: 'vis', vak: 'Wiskunde', klas: '2A' },
    ],
    toegangscodes: [
      {
        id: 'c1',
        code: 'DOC-1111',
        role: 'Docent',
        ownerName: 'Hans Visser',
        ownerEmail: 'vis@school.nl',
        docentAfkorting: 'vis',
        active: true,
      } as AccessCode,
      {
        id: 'c2',
        code: 'MEN-2222',
        role: 'Mentor',
        ownerName: 'Rumeysa Karaarslan',
        ownerEmail: 'kar@school.nl',
        docentAfkorting: 'kar',
        active: true,
      } as AccessCode,
      {
        id: 'c3',
        code: 'SU-9999',
        role: 'Superuser',
        ownerName: 'Admin',
        ownerEmail: 'admin@school.nl',
        docentAfkorting: 'bak',
        active: true,
      } as AccessCode,
    ],
    leerlingen: [
      {
        id: 'l1',
        leerlingnummer: '1001',
        leerling: 'Dae Aartsen',
        klas: '2HJ',
        mentorNaam: 'Rumeysa Karaarslan',
        mentorEmail: 'kar@school.nl',
        mentorAfkorting: 'kar',
        schooljaar: '2026-2027',
        actief: true,
      } as Leerling,
      {
        id: 'l2',
        leerlingnummer: '1002',
        leerling: 'Robin Zonder Mentor',
        klas: '2A',
        schooljaar: '2026-2027',
        actief: true,
      } as Leerling,
    ],
  };
}

describe('PR8 Readiness Gate', () => {
  it('geeft gereed: true wanneer alle 7 onderdelen correct zijn gemigreerd', () => {
    const invoer = schoneInvoer();
    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));

    expect(rapport.gereed).toBe(true);
    expect(rapport.totaalProblemen).toBe(0);
    expect(rapport.alleProblemen.length).toBe(0);
  });

  it('1. blokkeert bij dubbele canonieke docentafkortingen', () => {
    const invoer = schoneInvoer();
    invoer.docenten.push({ afkorting: 'VIS', naam: 'Hans Visser Duplicaat', actief: true });

    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));
    expect(rapport.gereed).toBe(false);
    expect(rapport.onderdelen['dubbele-docenten'].problemen).toBe(1);
    expect(rapport.onderdelen['dubbele-docenten'].herstelRoute).toBe('/manage-docenten');
  });

  it('2. blokkeert bij Docenten/Vakken zonder of met onbekende canonieke docent', () => {
    const invoer = schoneInvoer();
    invoer.docentVakken.push({
      id: 'dv_ontbreekt',
      docentNaam: 'Klaas Jansen',
      vak: 'Geschiedenis',
      klas: '2A',
    });
    invoer.docentVakken.push({
      id: 'dv_onbekend',
      docentNaam: 'Onbekend',
      docentAfkorting: 'xyz',
      vak: 'Biologie',
      klas: '2A',
    });

    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));
    expect(rapport.gereed).toBe(false);
    expect(rapport.onderdelen['docent-vakken'].problemen).toBe(2);
    expect(rapport.onderdelen['docent-vakken'].probleemItems[0].soort).toBe('ontbreekt');
    expect(rapport.onderdelen['docent-vakken'].probleemItems[1].soort).toBe('onbekend');
    expect(rapport.onderdelen['docent-vakken'].herstelRoute).toBe('/manage-docenten');
  });

  it('3. blokkeert bij DocentTaken zonder of met onbekende canonieke docent', () => {
    const invoer = schoneInvoer();
    invoer.docentTaken.push({
      id: 'dt_fout',
      docentNaam: 'Onbekend',
      docentAfkorting: 'xyz',
      vak: 'Wiskunde',
      klas: '2A',
    });

    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));
    expect(rapport.gereed).toBe(false);
    expect(rapport.onderdelen['docent-taken'].problemen).toBe(1);
    expect(rapport.onderdelen['docent-taken'].herstelRoute).toBe('/manage-docenten');
  });

  it('4. blokkeert bij Memo TW1/TW2 met ontbrekende of onbekende docentafkorting', () => {
    const invoer = schoneInvoer();
    invoer.memoTW1TW2.push({
      id: 'm1_fout',
      docentNaam: 'Onbekend',
      vak: 'Natuurkunde',
      klas: '2A',
    });

    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));
    expect(rapport.gereed).toBe(false);
    expect(rapport.onderdelen['memo-tw1tw2'].problemen).toBe(1);
    expect(rapport.onderdelen['memo-tw1tw2'].herstelRoute).toBe('/manage-docenten');
  });

  it('5. blokkeert bij Memo TW3 met ontbrekende of onbekende docentafkorting', () => {
    const invoer = schoneInvoer();
    invoer.memoTW3.push({
      id: 'm3_fout',
      docentNaam: 'Onbekend',
      docentAfkorting: 'onb',
      vak: 'Duits',
      klas: '2A',
    });

    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));
    expect(rapport.gereed).toBe(false);
    expect(rapport.onderdelen['memo-tw3'].problemen).toBe(1);
    expect(rapport.onderdelen['memo-tw3'].herstelRoute).toBe('/manage-docenten');
  });

  it('6. blokkeert bij actieve docent-/mentorcode zonder geldige docentAfkorting', () => {
    const invoer = schoneInvoer();
    invoer.toegangscodes.push({
      id: 'c_zonder_afk',
      code: 'DOC-9999',
      role: 'Docent',
      ownerName: 'Hans Visser', // naam overeenkomstig maar GEEN docentAfkorting!
      ownerEmail: 'vis@school.nl',
      active: true,
    } as AccessCode);

    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));
    expect(rapport.gereed).toBe(false);
    expect(rapport.onderdelen['toegangscodes'].problemen).toBe(1);
    expect(rapport.onderdelen['toegangscodes'].probleemItems[0].soort).toBe('ontbreekt');
    expect(rapport.onderdelen['toegangscodes'].herstelRoute).toBe('/superuser');
  });

  it('7. blokkeert bij leerling met mentorrelatie maar zonder geldige canonieke mentorAfkorting', () => {
    const invoer = schoneInvoer();
    invoer.leerlingen.push({
      id: 'l_zonder_afk',
      leerlingnummer: '1003',
      leerling: 'Sam van de Berg',
      klas: '2B',
      mentorNaam: 'Hans Visser', // Heeft mentorNaam, maar geen mentorAfkorting!
      mentorEmail: 'vis@school.nl',
      schooljaar: '2026-2027',
      actief: true,
    } as Leerling);

    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));
    expect(rapport.gereed).toBe(false);
    expect(rapport.onderdelen['leerling-mentoren'].problemen).toBe(1);
    expect(rapport.onderdelen['leerling-mentoren'].probleemItems[0].soort).toBe('ontbreekt');
    expect(rapport.onderdelen['leerling-mentoren'].herstelRoute).toBe('/manage-students');
  });

  it('7b. blokkeert bij leerling met onbekende mentorAfkorting', () => {
    const invoer = schoneInvoer();
    invoer.leerlingen.push({
      id: 'l_onbekend',
      leerlingnummer: '1004',
      leerling: 'Emma Test',
      klas: '2B',
      mentorAfkorting: 'xyz', // onbekend!
      schooljaar: '2026-2027',
      actief: true,
    } as Leerling);

    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));
    expect(rapport.gereed).toBe(false);
    expect(rapport.onderdelen['leerling-mentoren'].problemen).toBe(1);
    expect(rapport.onderdelen['leerling-mentoren'].probleemItems[0].soort).toBe('onbekend');
  });

  it('negeert inactieve toegangscodes zonder afkorting en leerlingen zonder mentor', () => {
    const invoer = schoneInvoer();
    invoer.toegangscodes.push({
      id: 'c_inactive',
      code: 'OLD-0000',
      role: 'Docent',
      ownerName: 'Oud Personeel',
      ownerEmail: 'oud@school.nl',
      active: false,
    } as AccessCode);

    invoer.leerlingen.push({
      id: 'l_geen_mentor',
      leerlingnummer: '1005',
      leerling: 'Geen Mentor',
      klas: '2C',
      schooljaar: '2026-2027',
      actief: true,
    } as Leerling);

    const rapport = controleerPR8Readiness(invoer);
    if (!rapport.gereed) console.log(JSON.stringify(rapport.alleProblemen, null, 2));
    expect(rapport.gereed).toBe(true);
    expect(rapport.totaalProblemen).toBe(0);
  });
});
