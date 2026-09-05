import { Leerling, DocentVak, MemoTW1TW2, MemoTW3, DocentTaak } from '../models/data.models';
import { vakSleutel } from './taak-status';
import { komtDocentOvereen } from './docent-identiteit';

/**
 * Zoekt naar gaten in de gegevens die verklaren waarom een scherm leeg blijft.
 *
 * Een mentor die geen leerlingen ziet, of een docent met een lege takenlijst,
 * heeft nu geen enkele aanwijzing waarom. Bijna altijd ligt het aan een
 * ontbrekende koppeling of een leeg e-mailadres, en dat is nergens zichtbaar.
 * Deze functies maken die gaten telbaar en aanwijsbaar.
 */

export type Ernst = 'blokkerend' | 'aandacht' | 'informatief';

export interface Signaal {
  code: string;
  titel: string;
  ernst: Ernst;
  aantal: number;
  /** Waarom dit een probleem is, in gewone taal. */
  gevolg: string;
  /** Wat de beheerder eraan kan doen. */
  oplossing: string;
  /** Een paar concrete voorbeelden, zodat het niet bij een getal blijft. */
  voorbeelden: string[];
}

const MAX_VOORBEELDEN = 5;

export interface SignaleringInvoer {
  leerlingen: Leerling[];
  docentVakken: DocentVak[];
  memoTW1TW2: MemoTW1TW2[];
  memoTW3: MemoTW3[];
  docentTaken: DocentTaak[];
  schooljaar: string;
}

export function bepaalSignalen(invoer: SignaleringInvoer): Signaal[] {
  const leerlingen = invoer.leerlingen.filter(l => l.schooljaar === invoer.schooljaar);
  const koppelingen = invoer.docentVakken.filter(dv => dv.schooljaar === invoer.schooljaar);
  const signalen: Signaal[] = [];

  const zonderKlas = leerlingen.filter(l => !l.klas?.trim());
  if (zonderKlas.length) {
    signalen.push({
      code: 'leerling-zonder-klas',
      titel: 'Leerlingen zonder klas',
      ernst: 'blokkerend',
      aantal: zonderKlas.length,
      gevolg: 'Deze leerlingen zijn nergens te selecteren: niet bij het invullen van een memo, niet in het mentoroverzicht.',
      oplossing: 'Vul de klas aan bij Beheer → Leerlingen, of importeer de lijst opnieuw met de klaskolom erin.',
      voorbeelden: zonderKlas.slice(0, MAX_VOORBEELDEN).map(l => `${l.leerling} (${l.leerlingnummer})`)
    });
  }

  const zonderMentor = leerlingen.filter(l => l.klas?.trim() && !l.mentorNaam?.trim());
  if (zonderMentor.length) {
    signalen.push({
      code: 'leerling-zonder-mentor',
      titel: 'Leerlingen zonder mentor',
      ernst: 'aandacht',
      aantal: zonderMentor.length,
      gevolg: 'Er is niemand verantwoordelijk voor de voorbereiding en het voortgangsplan van deze leerlingen.',
      oplossing: 'Vul de mentor aan bij Beheer → Leerlingen. In de Magister-export heet die kolom "Klassenmentor 1".',
      voorbeelden: zonderMentor.slice(0, MAX_VOORBEELDEN).map(l => `${l.leerling} — ${l.klas}`)
    });
  }

  const zonderMentorMail = leerlingen.filter(l => l.mentorNaam?.trim() && !l.mentorEmail?.trim());
  if (zonderMentorMail.length) {
    const mentoren = [...new Set(zonderMentorMail.map(l => l.mentorNaam))];
    signalen.push({
      code: 'mentor-zonder-email',
      titel: 'Mentoren zonder e-mailadres',
      ernst: 'aandacht',
      aantal: zonderMentorMail.length,
      gevolg: 'Zonder adres kan een mentor niet aan zijn eigen klas gekoppeld worden en kunnen er geen herinneringen worden verstuurd.',
      oplossing: 'Vul de mentoradressen aan. De Magister-export bevat die kolom niet, dus dit moet er los bij.',
      voorbeelden: mentoren.slice(0, MAX_VOORBEELDEN)
    });
  }

  const klassenMetLeerlingen = new Set(leerlingen.map(l => l.klas).filter(Boolean));
  const klassenMetDocenten = new Set(koppelingen.filter(dv => dv.actief).map(dv => dv.klas));
  const klassenZonderDocent = [...klassenMetLeerlingen].filter(k => !klassenMetDocenten.has(k)).sort();
  if (klassenZonderDocent.length) {
    signalen.push({
      code: 'klas-zonder-docenten',
      titel: 'Klassen zonder gekoppelde vakdocenten',
      ernst: 'blokkerend',
      aantal: klassenZonderDocent.length,
      gevolg: 'Voor deze klassen kunnen geen taken worden uitgezet en blijft het statusbord leeg.',
      oplossing: 'Koppel de vakdocenten bij Beheer → Docenten/Vakken.',
      voorbeelden: klassenZonderDocent.slice(0, MAX_VOORBEELDEN)
    });
  }

  const docentZonderMail = koppelingen.filter(dv => dv.actief && !dv.docentEmail?.trim());
  if (docentZonderMail.length) {
    signalen.push({
      code: 'docent-zonder-email',
      titel: 'Docentkoppelingen zonder e-mailadres',
      ernst: 'blokkerend',
      aantal: docentZonderMail.length,
      gevolg: 'Deze docenten kunnen hun takenlijst niet zien: die wordt op e-mailadres gekoppeld aan hun toegangscode.',
      oplossing: 'Vul het adres aan bij Beheer → Docenten/Vakken.',
      voorbeelden: docentZonderMail.slice(0, MAX_VOORBEELDEN).map(dv => `${dv.docentNaam} — ${dv.vak} ${dv.klas}`)
    });
  }

  // Memo's op een vak dat niet aan de klas gekoppeld is: vaak een typefout,
  // soms een docent die "Anders, zelf invullen" gebruikte.
  const gekoppeldeVakken = new Set(koppelingen.map(dv => `${dv.klas.toLowerCase()}|${dv.vak.trim().toLowerCase()}`));
  const alleMemos: (MemoTW1TW2 | MemoTW3)[] = [
    ...invoer.memoTW1TW2.filter(m => m.schooljaar === invoer.schooljaar),
    ...invoer.memoTW3.filter(m => m.schooljaar === invoer.schooljaar)
  ];
  const losseMemos = alleMemos.filter(m => !gekoppeldeVakken.has(`${(m.klas || '').toLowerCase()}|${m.vak.trim().toLowerCase()}`));
  if (losseMemos.length) {
    signalen.push({
      code: 'memo-zonder-koppeling',
      titel: 'Memo\'s op een vak dat niet aan de klas gekoppeld is',
      ernst: 'informatief',
      aantal: losseMemos.length,
      gevolg: 'Deze memo\'s tellen niet mee in het statusbord van de klas en zijn daar alleen als losse kolom zichtbaar.',
      oplossing: 'Controleer of de vaknaam klopt, of koppel het vak alsnog aan de klas.',
      voorbeelden: [...new Set(losseMemos.map(m => `${m.vak} (${m.klas}) — ${m.docentNaam}`))].slice(0, MAX_VOORBEELDEN)
    });
  }

  // Taken die naar een docent wijzen die nergens meer gekoppeld is.
  const takenDitJaar = invoer.docentTaken.filter(t => t.schooljaar === invoer.schooljaar);
  const wezenTaken = takenDitJaar.filter(t => !koppelingen.some(dv => komtDocentOvereen(dv, t)));
  if (wezenTaken.length) {
    signalen.push({
      code: 'taak-zonder-docent',
      titel: 'Taken bij een docent die niet meer gekoppeld is',
      ernst: 'aandacht',
      aantal: wezenTaken.length,
      gevolg: 'Deze taken verschijnen bij niemand in de takenlijst, maar blijven wel als openstaand meetellen.',
      oplossing: 'Koppel de docent opnieuw, of trek de taak in via het mentoroverzicht.',
      voorbeelden: [...new Set(wezenTaken.map(t => `${t.docentNaam} (${t.docentEmail || 'geen adres'})`))].slice(0, MAX_VOORBEELDEN)
    });
  }

  // Dubbele leerlingnummers duiden op een import die is misgegaan.
  const perNummer = new Map<string, Leerling[]>();
  for (const l of leerlingen) {
    perNummer.set(l.leerlingnummer, [...(perNummer.get(l.leerlingnummer) ?? []), l]);
  }
  const dubbel = [...perNummer.entries()].filter(([, rijen]) => rijen.length > 1);
  if (dubbel.length) {
    signalen.push({
      code: 'dubbele-leerling',
      titel: 'Leerlingnummers die meer dan één keer voorkomen',
      ernst: 'blokkerend',
      aantal: dubbel.length,
      gevolg: 'Memo\'s kunnen bij de verkeerde regel terechtkomen en overzichten tellen dubbel.',
      oplossing: 'Verwijder de dubbele regels bij Beheer → Leerlingen.',
      voorbeelden: dubbel.slice(0, MAX_VOORBEELDEN).map(([nummer, rijen]) => `${nummer} — ${rijen.length}× (${rijen[0].leerling})`)
    });
  }

  const volgorde: Record<Ernst, number> = { blokkerend: 0, aandacht: 1, informatief: 2 };
  return signalen.sort((a, b) => volgorde[a.ernst] - volgorde[b.ernst] || b.aantal - a.aantal);
}

export interface VoortgangPerKlas {
  klas: string;
  leerlingen: number;
  verwachteMemos: number;
  ingevuldeMemos: number;
  openstaandeTaken: number;
  opSlot: boolean;
}

/**
 * Hoeveel er per klas al binnen is. "Verwacht" is het aantal leerlingen maal
 * het aantal gekoppelde vakdocenten: als iedereen invult, is dat het totaal.
 */
export function voortgangPerKlas(invoer: SignaleringInvoer & { periode: string; opSlot: (klas: string) => boolean }): VoortgangPerKlas[] {
  const leerlingen = invoer.leerlingen.filter(l => l.actief && l.schooljaar === invoer.schooljaar && l.klas);
  const koppelingen = invoer.docentVakken.filter(dv => dv.actief && dv.schooljaar === invoer.schooljaar);

  const memos = invoer.periode === 'TW3'
    ? invoer.memoTW3.filter(m => m.schooljaar === invoer.schooljaar)
    : invoer.memoTW1TW2.filter(m => m.schooljaar === invoer.schooljaar && m.toetsweek === invoer.periode);

  const ingevuld = new Set(memos.map(m => vakSleutel(m.leerlingnummer, m.vak)));

  const klassen = [...new Set(leerlingen.map(l => l.klas))].sort((a, b) => a.localeCompare(b, 'nl'));

  return klassen.map(klas => {
    const inKlas = leerlingen.filter(l => l.klas === klas);
    const vakken = koppelingen.filter(dv => dv.klas === klas);

    let ingevuldeMemos = 0;
    for (const leerling of inKlas) {
      for (const vak of vakken) {
        if (ingevuld.has(vakSleutel(leerling.leerlingnummer, vak.vak))) ingevuldeMemos++;
      }
    }

    const nummers = new Set(inKlas.map(l => l.leerlingnummer));
    const openstaandeTaken = invoer.docentTaken.filter(t =>
      t.schooljaar === invoer.schooljaar &&
      t.periode === invoer.periode &&
      nummers.has(t.leerlingnummer) &&
      !ingevuld.has(vakSleutel(t.leerlingnummer, t.vak))
    ).length;

    return {
      klas,
      leerlingen: inKlas.length,
      verwachteMemos: inKlas.length * vakken.length,
      ingevuldeMemos,
      openstaandeTaken,
      opSlot: invoer.opSlot(klas)
    };
  });
}
