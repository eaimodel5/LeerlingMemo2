import { afterAll, afterEach, beforeAll, describe, it } from 'vitest';
import { RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import {
  Rol,
  SCHOOLJAAR,
  alsAangemeld,
  alsGebruiker,
  alsOnbekende,
  codeDoc,
  leerlingDoc,
  maakOmgeving,
  memoDoc,
  seed,
  sessieDoc,
  trekCodeIn,
  verwijderActiefVeld,
} from './helpers';

let omgeving: RulesTestEnvironment;

beforeAll(async () => {
  omgeving = await maakOmgeving();
});

afterEach(async () => {
  await omgeving.clearFirestore();
});

afterAll(async () => {
  await omgeving.cleanup();
});

const ROLLEN: Rol[] = ['Docent', 'Mentor', 'Coordinator', 'Superuser'];

describe('niet ingelogd', () => {
  it('komt nergens bij', async () => {
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await seed(omgeving, 'memoTW1TW2/m1', memoDoc());

    const db = alsOnbekende(omgeving);
    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));
    await assertFails(getDocs(collection(db, 'memoTW1TW2')));
    await assertFails(setDoc(doc(db, 'memoTW1TW2', 'nieuw'), memoDoc()));
  });

  it('kan een code niet opvragen', async () => {
    // De inlogpagina haalt de code op met een `get`. Dat mag pas na de anonieme
    // aanmelding bij Firebase.
    await seed(omgeving, 'codes/AAAA-BBBB', codeDoc());
    await assertFails(getDoc(doc(alsOnbekende(omgeving), 'codes', 'AAAA-BBBB')));
  });
});

describe('inloggen', () => {
  it('mag de code opvragen op document-ID zodra je bent aangemeld', async () => {
    // Dit was de storing: loginWithCode zocht met een query, en dat is een
    // `list` op de hele collectie -- alleen voor de beheerder.
    await seed(omgeving, 'codes/AAAA-BBBB', codeDoc());
    const db = alsAangemeld(omgeving);
    await assertSucceeds(getDoc(doc(db, 'codes', 'AAAA-BBBB')));
  });

  it('mag de codelijst niet doorzoeken', async () => {
    await seed(omgeving, 'codes/AAAA-BBBB', codeDoc());
    const db = alsAangemeld(omgeving);
    await assertFails(getDocs(collection(db, 'codes')));
  });

  it('schrijft een sessie met de rol uit het code-document', async () => {
    await seed(omgeving, 'codes/AAAA-BBBB', codeDoc({ role: 'Mentor' }));
    const db = alsAangemeld(omgeving, 'ik');
    await assertSucceeds(
      setDoc(doc(db, 'userSessions', 'ik'), sessieDoc({ role: 'Mentor' })),
    );
  });

  it('kan geen hogere rol verzinnen dan in de code staat', async () => {
    // De hele opzet steunt hierop: de rol komt uit /codes, niet uit de browser.
    await seed(omgeving, 'codes/AAAA-BBBB', codeDoc({ role: 'Docent' }));
    const db = alsAangemeld(omgeving, 'ik');
    await assertFails(
      setDoc(doc(db, 'userSessions', 'ik'), sessieDoc({ role: 'Superuser' })),
    );
  });

  it('kan geen sessie schrijven op de uid van iemand anders', async () => {
    await seed(omgeving, 'codes/AAAA-BBBB', codeDoc());
    const db = alsAangemeld(omgeving, 'ik');
    await assertFails(setDoc(doc(db, 'userSessions', 'iemand-anders'), sessieDoc()));
  });

  it('kan geen sessie schrijven met een code die niet bestaat', async () => {
    const db = alsAangemeld(omgeving, 'ik');
    await assertFails(setDoc(doc(db, 'userSessions', 'ik'), sessieDoc({ code: 'ZZZZ-ZZZZ' })));
  });

  it('kan geen sessie beginnen met een ingetrokken code', async () => {
    await seed(omgeving, 'codes/AAAA-BBBB', codeDoc({ active: false }));
    const db = alsAangemeld(omgeving, 'ik');
    await assertFails(setDoc(doc(db, 'userSessions', 'ik'), sessieDoc()));
  });

  it('mag de eigen sessie opruimen bij uitloggen', async () => {
    const db = await alsGebruiker(omgeving);
    await assertSucceeds(deleteDoc(doc(db, 'userSessions', 'gebruiker-1')));
  });
});

describe('een sessie die niet klopt geeft geen toegang', () => {
  it('sessie zonder code', async () => {
    const db = await alsGebruiker(omgeving, { sessieZonderCode: true });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));
  });

  it('sessie waarvan de code is verwijderd', async () => {
    const db = await alsGebruiker(omgeving, { zonderCode: true });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));
  });

  it('sessie met een andere rol dan de code', async () => {
    // Wie zijn sessiedocument met de hand op Superuser zet, komt niet verder:
    // de regels vergelijken hem met de rol in /codes.
    const db = await alsGebruiker(omgeving, { rol: 'Docent', sessieRol: 'Superuser' });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));
  });

  it('helemaal geen sessiedocument', async () => {
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    const db = alsAangemeld(omgeving, 'zonder-sessie');
    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));
  });
});

describe('een ingetrokken code sluit ook een lopende sessie af', () => {
  it('werkt eerst gewoon, en daarna niet meer', async () => {
    // Dit is de belangrijkste regressietest van PR 2. Zonder de controle op de
    // code bleef iemand die al was ingelogd doorwerken -- zijn sessiedocument
    // was immers al geschreven.
    const db = await alsGebruiker(omgeving, { rol: 'Mentor' });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());

    await assertSucceeds(getDoc(doc(db, 'leerlingen', 'l1')));

    await trekCodeIn(omgeving);

    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));
    await assertFails(setDoc(doc(db, 'memoTW1TW2', 'nieuw'), memoDoc()));
  });

  it('een code zonder het veld active blijft werken', async () => {
    // Codes van voor deze wijziging hebben het veld niet. Zouden die als
    // ingetrokken tellen, dan sluit het publiceren van deze regels iedereen in
    // een klap buiten.
    const db = await alsGebruiker(omgeving, { rol: 'Mentor', zonderActiefVeld: true });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertSucceeds(getDoc(doc(db, 'leerlingen', 'l1')));
  });

  it('een weer geactiveerde code geeft opnieuw toegang', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Mentor', ingetrokken: true });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));

    await verwijderActiefVeld(omgeving);
    await assertSucceeds(getDoc(doc(db, 'leerlingen', 'l1')));
  });
});

describe('lezen: elke rol met een geldige sessie mag de gegevens zien', () => {
  for (const rol of ROLLEN) {
    it(rol, async () => {
      const db = await alsGebruiker(omgeving, { rol });
      await seed(omgeving, 'leerlingen/l1', leerlingDoc());
      await seed(omgeving, 'memoTW1TW2/m1', memoDoc());
      await seed(omgeving, 'docentenVakken/dv1', { docentNaam: 'Hans Visser', vak: 'Wiskunde', klas: 'H4A' });

      await assertSucceeds(getDoc(doc(db, 'leerlingen', 'l1')));
      await assertSucceeds(getDocs(collection(db, 'memoTW1TW2')));
      await assertSucceeds(getDocs(collection(db, 'docentenVakken')));
    });
  }
});

describe('memo schrijven', () => {
  it('mag door elke rol, ook een vakdocent', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Docent' });
    await assertSucceeds(setDoc(doc(db, 'memoTW1TW2', 'nieuw'), memoDoc()));
  });

  it('verwijderen mag vanaf mentor', async () => {
    for (const rol of ['Mentor', 'Coordinator', 'Superuser'] as const) {
      await omgeving.clearFirestore();
      const db = await alsGebruiker(omgeving, { rol });
      await seed(omgeving, 'memoTW1TW2/m1', memoDoc());
      await assertSucceeds(deleteDoc(doc(db, 'memoTW1TW2', 'm1')));
    }
  });

  it('verwijderen mag niet door een vakdocent', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Docent' });
    await seed(omgeving, 'memoTW1TW2/m1', memoDoc());
    await assertFails(deleteDoc(doc(db, 'memoTW1TW2', 'm1')));
  });
});

describe('docenten (/docenten)', () => {
  const docent = { afkorting: 'vis', naam: 'Hans Visser', email: 'visser@school.nl', actief: true };

  it('mag door iedereen met een geldige sessie gelezen worden', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Docent' });
    await seed(omgeving, 'docenten/vis', docent);
    await assertSucceeds(getDoc(doc(db, 'docenten', 'vis')));
    await assertSucceeds(getDocs(collection(db, 'docenten')));
  });

  it('niet ingelogd komt er niet bij', async () => {
    await seed(omgeving, 'docenten/vis', docent);
    await assertFails(getDoc(doc(alsOnbekende(omgeving), 'docenten', 'vis')));
  });

  it('aanmaken en bijwerken mag vanaf mentor', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Mentor' });
    await assertSucceeds(setDoc(doc(db, 'docenten', 'vis'), docent));
    await assertSucceeds(setDoc(doc(db, 'docenten', 'vis'), { naam: 'H. Visser' }, { merge: true }));
  });

  it('aanmaken mag niet door een vakdocent', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Docent' });
    await assertFails(setDoc(doc(db, 'docenten', 'vis'), docent));
  });

  it('verwijderen mag pas vanaf coordinator', async () => {
    const mentor = await alsGebruiker(omgeving, { uid: 'mentor', rol: 'Mentor', code: 'MENT-0001' });
    await seed(omgeving, 'docenten/vis', docent);
    await assertFails(deleteDoc(doc(mentor, 'docenten', 'vis')));

    const coordinator = await alsGebruiker(omgeving, { uid: 'coord', rol: 'Coordinator', code: 'COOR-0001' });
    await assertSucceeds(deleteDoc(doc(coordinator, 'docenten', 'vis')));
  });
});

describe('leerlingen beheren', () => {
  it('bewerken mag vanaf mentor', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Mentor' });
    await assertSucceeds(setDoc(doc(db, 'leerlingen', 'l1'), leerlingDoc()));
  });

  it('bewerken mag niet door een vakdocent', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Docent' });
    await assertFails(setDoc(doc(db, 'leerlingen', 'l1'), leerlingDoc()));
  });

  it('verwijderen mag pas vanaf coordinator', async () => {
    const mentor = await alsGebruiker(omgeving, { uid: 'mentor', rol: 'Mentor', code: 'MENT-0001' });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertFails(deleteDoc(doc(mentor, 'leerlingen', 'l1')));

    const coordinator = await alsGebruiker(omgeving, {
      uid: 'coord',
      rol: 'Coordinator',
      code: 'COOR-0001',
    });
    await assertSucceeds(deleteDoc(doc(coordinator, 'leerlingen', 'l1')));
  });
});

describe('klas op slot', () => {
  it('mag vanaf mentor', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Mentor' });
    await assertSucceeds(
      setDoc(doc(db, 'classLocks', 'H4A_TW1_2026-2027'), {
        klas: 'H4A',
        periode: 'TW1',
        schooljaar: SCHOOLJAAR,
        isLocked: true,
        lockedBy: 'mentor@school.nl',
        lockedAt: '2026-09-01T10:00:00.000Z',
      }),
    );
  });

  it('mag niet door een vakdocent', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Docent' });
    await assertFails(
      setDoc(doc(db, 'classLocks', 'H4A_TW1_2026-2027'), {
        klas: 'H4A',
        periode: 'TW1',
        schooljaar: SCHOOLJAAR,
        isLocked: true,
        lockedBy: 'visser@school.nl',
        lockedAt: '2026-09-01T10:00:00.000Z',
      }),
    );
  });
});

describe('voorbereiding en voortgangsplan', () => {
  it('lezen mag iedereen met een geldige sessie', async () => {
    const db = await alsGebruiker(omgeving, { rol: 'Docent' });
    await seed(omgeving, 'mentorVoorbereiding/p1', { leerlingnummer: '123456', periode: 'TW1' });
    await assertSucceeds(getDoc(doc(db, 'mentorVoorbereiding', 'p1')));
  });

  it('schrijven mag pas vanaf mentor', async () => {
    const docent = await alsGebruiker(omgeving, { uid: 'docent', rol: 'Docent', code: 'DOC-0001' });
    await assertFails(
      setDoc(doc(docent, 'mentorVoorbereiding', 'p1'), { leerlingnummer: '123456', periode: 'TW1' }),
    );

    const mentor = await alsGebruiker(omgeving, { uid: 'mentor', rol: 'Mentor', code: 'MENT-0001' });
    await assertSucceeds(
      setDoc(doc(mentor, 'voortgangsplan', 'v1'), { leerlingnummer: '123456', periode: 'TW1' }),
    );
  });
});

describe('toegangscodes beheren', () => {
  it('alleen de beheerder ziet de hele lijst', async () => {
    const mentor = await alsGebruiker(omgeving, { uid: 'mentor', rol: 'Mentor', code: 'MENT-0001' });
    await assertFails(getDocs(collection(mentor, 'codes')));

    const beheerder = await alsGebruiker(omgeving, { uid: 'beheer', rol: 'Superuser', code: 'SUP-0001' });
    await assertSucceeds(getDocs(collection(beheerder, 'codes')));
  });

  it('alleen de beheerder maakt of wijzigt codes', async () => {
    const mentor = await alsGebruiker(omgeving, { uid: 'mentor', rol: 'Mentor', code: 'MENT-0001' });
    await assertFails(setDoc(doc(mentor, 'codes', 'NIEUW-0001'), codeDoc({ code: 'NIEUW-0001' })));

    const beheerder = await alsGebruiker(omgeving, { uid: 'beheer', rol: 'Superuser', code: 'SUP-0001' });
    await assertSucceeds(setDoc(doc(beheerder, 'codes', 'NIEUW-0001'), codeDoc({ code: 'NIEUW-0001' })));
  });

  it('de beheerder kan een code intrekken', async () => {
    const beheerder = await alsGebruiker(omgeving, { uid: 'beheer', rol: 'Superuser', code: 'SUP-0001' });
    await seed(omgeving, 'codes/DOC-0001', codeDoc({ code: 'DOC-0001' }));
    await assertSucceeds(
      setDoc(doc(beheerder, 'codes', 'DOC-0001'), { active: false }, { merge: true }),
    );
  });
});

describe('sessies inzien', () => {
  it('je eigen sessie mag je lezen', async () => {
    const db = await alsGebruiker(omgeving);
    await assertSucceeds(getDoc(doc(db, 'userSessions', 'gebruiker-1')));
  });

  it('die van een ander niet', async () => {
    const db = await alsGebruiker(omgeving, { uid: 'ik', code: 'IK-0001' });
    await seed(omgeving, 'userSessions/iemand-anders', sessieDoc());
    await assertFails(getDoc(doc(db, 'userSessions', 'iemand-anders')));
  });

  it('de beheerder mag de lijst opvragen', async () => {
    const beheerder = await alsGebruiker(omgeving, { uid: 'beheer', rol: 'Superuser', code: 'SUP-0001' });
    await assertSucceeds(getDocs(collection(beheerder, 'userSessions')));
  });
});

describe('docentafkorting in code en sessie (PR 6)', () => {
  it('A. Legacycode zonder docentAfkorting -> sessie zonder docentAfkorting toegestaan', async () => {
    await seed(omgeving, 'codes/LEGACY-1', codeDoc({ code: 'LEGACY-1', role: 'Docent' }));
    const db = alsAangemeld(omgeving, 'usr-legacy');
    await assertSucceeds(
      setDoc(doc(db, 'userSessions', 'usr-legacy'), sessieDoc({ code: 'LEGACY-1', role: 'Docent' }))
    );
  });

  it('B. Legacycode zonder docentAfkorting -> normale gegevensrechten blijven werken', async () => {
    const db = await alsGebruiker(omgeving, { uid: 'usr-leg-b', code: 'LEG-B' });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertSucceeds(getDoc(doc(db, 'leerlingen', 'l1')));
  });

  it('C. Code met docentAfkorting "vis" -> sessie met "vis" toegestaan', async () => {
    await seed(omgeving, 'codes/VIS-1', codeDoc({ code: 'VIS-1', role: 'Docent', docentAfkorting: 'vis' }));
    const db = alsAangemeld(omgeving, 'usr-vis');
    await assertSucceeds(
      setDoc(doc(db, 'userSessions', 'usr-vis'), sessieDoc({ code: 'VIS-1', role: 'Docent', docentAfkorting: 'vis' }))
    );
  });

  it('D. Code met docentAfkorting "vis" -> sessie met "jan" geweigerd', async () => {
    await seed(omgeving, 'codes/VIS-1', codeDoc({ code: 'VIS-1', role: 'Docent', docentAfkorting: 'vis' }));
    const db = alsAangemeld(omgeving, 'usr-vis-fraud');
    await assertFails(
      setDoc(doc(db, 'userSessions', 'usr-vis-fraud'), sessieDoc({ code: 'VIS-1', role: 'Docent', docentAfkorting: 'jan' }))
    );
  });

  it('E. Code met docentAfkorting "vis" -> sessie zonder docentAfkorting geweigerd', async () => {
    await seed(omgeving, 'codes/VIS-1', codeDoc({ code: 'VIS-1', role: 'Docent', docentAfkorting: 'vis' }));
    const db = alsAangemeld(omgeving, 'usr-vis-empty');
    await assertFails(
      setDoc(doc(db, 'userSessions', 'usr-vis-empty'), sessieDoc({ code: 'VIS-1', role: 'Docent' }))
    );
  });

  it('F. Legacycode zonder docentAfkorting -> sessie die zelf "vis" toevoegt geweigerd', async () => {
    await seed(omgeving, 'codes/LEGACY-2', codeDoc({ code: 'LEGACY-2', role: 'Docent' }));
    const db = alsAangemeld(omgeving, 'usr-leg-forge');
    await assertFails(
      setDoc(doc(db, 'userSessions', 'usr-leg-forge'), sessieDoc({ code: 'LEGACY-2', role: 'Docent', docentAfkorting: 'vis' }))
    );
  });

  it('G. Ongeldige bestaande sessie waarbij rol klopt maar docentAfkorting afwijkt -> normale toegang geweigerd', async () => {
    const db = await alsGebruiker(omgeving, {
      uid: 'usr-mismatch',
      code: 'VIS-MIS',
      docentAfkorting: 'vis',
      sessieDocentAfkorting: 'jan',
    });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));
  });

  it('H. Intrekken van een code met docentAfkorting -> bestaande sessie verliest toegang', async () => {
    const db = await alsGebruiker(omgeving, {
      uid: 'usr-vis-revoke',
      code: 'VIS-REV',
      docentAfkorting: 'vis',
    });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertSucceeds(getDoc(doc(db, 'leerlingen', 'l1')));

    await trekCodeIn(omgeving, 'VIS-REV');
    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));
  });

  it('I. Opnieuw activeren met geldige waarden -> toegang kan weer correct tot stand komen', async () => {
    const db = await alsGebruiker(omgeving, {
      uid: 'usr-vis-reactivate',
      code: 'VIS-REACT',
      docentAfkorting: 'vis',
      ingetrokken: true,
    });
    await seed(omgeving, 'leerlingen/l1', leerlingDoc());
    await assertFails(getDoc(doc(db, 'leerlingen', 'l1')));

    await seed(omgeving, 'codes/VIS-REACT', codeDoc({ code: 'VIS-REACT', role: 'Docent', docentAfkorting: 'vis', active: true }));
    await assertSucceeds(getDoc(doc(db, 'leerlingen', 'l1')));
  });
});
