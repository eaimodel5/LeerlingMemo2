import { describe, it, expect } from 'vitest';
import { parseCsv } from './csv';
import { normaliseerKoppen, rijNaarObject, leesLeerlingRij } from './leerling-import';

/** Leest een compleet CSV-bestand uit, zoals het beheerscherm dat doet. */
function importeer(csv: string) {
  const rijen = parseCsv(csv);
  const koppen = normaliseerKoppen(rijen[0]);
  return rijen.slice(1).map(rij => leesLeerlingRij(rijNaarObject(koppen, rij)));
}

describe('leerlingbestand uit Magister', () => {
  // Exact de kopregel en opmaak van de export die het Emmauscollege gebruikt,
  // inclusief BOM en lege velden als "".
  const magister =
    '﻿Stamnummer,Roepnaam,Tussenvoegsel,Achternaam,Klas,Klassenmentor 1\n' +
    '114334,Dae,"",Aartsen,3HB,Bart Houtman\n' +
    '115063,Elissa,"",Abarkan,2HE,Nadine van Roest\n' +
    '114335,Hamlet,"",Abate,4VD,""\n';

  it('leest de mentor uit de kolom "Klassenmentor 1"', () => {
    const rijen = importeer(magister);
    expect(rijen[0].mentorNaam).toBe('Bart Houtman');
    expect(rijen[1].mentorNaam).toBe('Nadine van Roest');
  });

  it('laat de mentor leeg als die niet is ingevuld', () => {
    expect(importeer(magister)[2].mentorNaam).toBe('');
  });

  it('stelt de volledige naam samen uit roepnaam, tussenvoegsel en achternaam', () => {
    expect(importeer(magister)[0].leerling).toBe('Dae Aartsen');
  });

  it('neemt stamnummer en klas over', () => {
    const rij = importeer(magister)[0];
    expect(rij.leerlingnummer).toBe('114334');
    expect(rij.klas).toBe('3HB');
  });

  it('zet geen dubbele spatie neer bij een leeg tussenvoegsel', () => {
    expect(importeer(magister)[1].leerling).toBe('Elissa Abarkan');
  });

  it('verwerkt een tussenvoegsel wel als het er staat', () => {
    const csv = 'Stamnummer,Roepnaam,Tussenvoegsel,Achternaam,Klas,Klassenmentor 1\n' +
                '114400,Nadine,van,Roest,2HE,Bart Houtman';
    expect(importeer(csv)[0].leerling).toBe('Nadine van Roest');
  });
});

describe('leerlingbestand in het eigen sjabloon', () => {
  const eigen =
    'leerlingnummer,leerling,klas,mentorNaam,mentorEmail,schooljaar,actief\n' +
    '114334,Dae Aartsen,2HJ,Rumeysa Karaarslan,rkaraarslan@emmauscollege.nl,2026-2027,true';

  it('gebruikt de eigen kolommen als die er zijn', () => {
    const rij = importeer(eigen)[0];
    expect(rij).toMatchObject({
      leerlingnummer: '114334',
      leerling: 'Dae Aartsen',
      klas: '2HJ',
      mentorNaam: 'Rumeysa Karaarslan',
      mentorEmail: 'rkaraarslan@emmauscollege.nl',
      actief: true
    });
  });

  it('leest actief=false als inactief', () => {
    const csv = eigen.replace(',true', ',false');
    expect(importeer(csv)[0].actief).toBe(false);
  });
});

describe('lastige tekst in velden', () => {
  it('houdt een komma in een naam bij elkaar', () => {
    const csv = 'Stamnummer,Naam,Klas,Klassenmentor 1\n114334,"Aartsen, Dae",3HB,"Houtman, Bart"';
    const rij = importeer(csv)[0];
    expect(rij.leerling).toBe('Aartsen, Dae');
    expect(rij.mentorNaam).toBe('Houtman, Bart');
  });

  it('werkt ook met puntkomma\'s als scheidingsteken', () => {
    const csv = 'Stamnummer;Roepnaam;Tussenvoegsel;Achternaam;Klas;Klassenmentor 1\n114334;Dae;;Aartsen;3HB;Bart Houtman';
    expect(importeer(csv)[0].mentorNaam).toBe('Bart Houtman');
  });
});
