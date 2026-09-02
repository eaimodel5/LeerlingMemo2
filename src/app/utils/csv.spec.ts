import { describe, it, expect } from 'vitest';
import { parseCsv, toCsv, detectDelimiter, headersMatch } from './csv';

describe('parseCsv', () => {
  it('houdt een puntkomma binnen aanhalingstekens bij het veld', () => {
    const csv = 'Leerlingnummer;Naam;Waar zie je dit aan?\n114334;Dae Aartsen;"Komt te laat; levert werk niet in"';
    expect(parseCsv(csv)).toEqual([
      ['Leerlingnummer', 'Naam', 'Waar zie je dit aan?'],
      ['114334', 'Dae Aartsen', 'Komt te laat; levert werk niet in']
    ]);
  });

  it('houdt een regeleinde binnen aanhalingstekens bij het veld', () => {
    const csv = 'Naam;Toelichting\nDae;"Regel een\nRegel twee"';
    expect(parseCsv(csv)).toEqual([
      ['Naam', 'Toelichting'],
      ['Dae', 'Regel een\nRegel twee']
    ]);
  });

  it('leest een verdubbeld aanhalingsteken als één teken', () => {
    const csv = 'Naam;Citaat\nDae;"Zegt ""ik snap het niet"" bij elke toets"';
    expect(parseCsv(csv)[1][1]).toBe('Zegt "ik snap het niet" bij elke toets');
  });

  it('werkt met CRLF en met een BOM van Excel', () => {
    const csv = '﻿Leerlingnummer;Naam\r\n114334;Dae Aartsen\r\n';
    expect(parseCsv(csv)).toEqual([
      ['Leerlingnummer', 'Naam'],
      ['114334', 'Dae Aartsen']
    ]);
  });

  it('slaat volledig lege regels over', () => {
    const csv = 'A;B\n1;2\n\n;\n3;4';
    expect(parseCsv(csv)).toEqual([['A', 'B'], ['1', '2'], ['3', '4']]);
  });

  it('herkent komma-bestanden', () => {
    expect(parseCsv('a,b,c\n1,2,3')).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });
});

describe('detectDelimiter', () => {
  it('kiest de puntkomma bij Nederlandse Excel-export', () => {
    expect(detectDelimiter('Naam;Klas;Toelichting\nDae;2HJ;"a,b,c"')).toBe(';');
  });

  it('telt scheidingstekens binnen aanhalingstekens niet mee', () => {
    expect(detectDelimiter('Naam,Toelichting\nDae,"a;b;c;d;e"')).toBe(',');
  });
});

describe('toCsv', () => {
  it('pakt velden in die het scheidingsteken of een aanhalingsteken bevatten', () => {
    const csv = toCsv([['Naam', 'Toelichting'], ['Dae', 'Te laat; en zegt "later"']]);
    expect(csv).toBe('Naam;Toelichting\r\nDae;"Te laat; en zegt ""later"""');
  });

  it('levert een bestand op dat parseCsv weer terugleest', () => {
    const rows = [
      ['Leerlingnummer', 'Naam', 'Waar zie je dit aan?'],
      ['114334', 'Aartsen, Dae', 'Komt te laat; praat door\nen levert werk niet in']
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

describe('headersMatch', () => {
  it('negeert hoofdletters, extra spaties en een BOM', () => {
    expect(headersMatch(['﻿Leerlingnummer', ' naam ', 'KLAS'], ['Leerlingnummer', 'Naam', 'Klas'])).toBe(true);
  });

  it('meldt een verschil in kolomnamen', () => {
    expect(headersMatch(['Leerlingnummer', 'Voornaam'], ['Leerlingnummer', 'Naam'])).toBe(false);
  });
});
