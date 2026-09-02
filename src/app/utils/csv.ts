/**
 * Gedeelde CSV-hulpfuncties voor import en export.
 *
 * De schermen splitsten voorheen elk apart op `;` of `,` met `String.split()`.
 * Dat gaat mis zodra een docent een puntkomma, een komma, een aanhalingsteken
 * of een regeleinde in een tekstveld typt — en dat gebeurt juist in velden als
 * "Waar zie je dit concreet aan?". Deze module volgt RFC 4180 en wordt door
 * alle import- en exportknoppen gebruikt.
 */

import { downloadBestand } from './download';

/** Byte order mark die Excel voor de zekerheid aan UTF-8-bestanden toevoegt. */
const BOM = '﻿';

/**
 * Bepaalt of het bestand puntkomma's of komma's gebruikt, door alleen te tellen
 * wat buiten aanhalingstekens staat. Nederlandse Excel schrijft puntkomma's.
 */
export function detectDelimiter(text: string): ';' | ',' {
  let inQuotes = false;
  let semicolons = 0;
  let commas = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      // Twee aanhalingstekens achter elkaar zijn een ontsnapt aanhalingsteken.
      if (inQuotes && text[i + 1] === '"') { i++; continue; }
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (char === ';') semicolons++;
      else if (char === ',') commas++;
      else if (char === '\n') break; // alleen de eerste regel telt mee
    }
  }

  return semicolons >= commas ? ';' : ',';
}

/**
 * Leest een CSV-tekst uit tot een tabel van rijen met velden.
 *
 * Ondersteunt velden tussen aanhalingstekens, verdubbelde aanhalingstekens,
 * regeleinden binnen een veld, en zowel LF als CRLF. Een eventuele BOM wordt
 * verwijderd. Volledig lege regels worden overgeslagen.
 */
export function parseCsv(text: string, delimiter?: string): string[][] {
  if (text.startsWith(BOM)) text = text.slice(1);

  const sep = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const endField = () => { row.push(field.trim()); field = ''; };
  const endRow = () => {
    endField();
    // Een regel met alleen lege velden levert geen bruikbare gegevens op.
    if (row.some(value => value !== '')) rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === sep) endField();
    else if (char === '\r') { /* onderdeel van CRLF, negeren */ }
    else if (char === '\n') endRow();
    else field += char;
  }

  // Laatste regel afsluiten als het bestand niet op een regeleinde eindigt.
  if (field !== '' || row.length > 0) endRow();

  return rows;
}

/**
 * Zet een tabel om naar CSV-tekst. Velden met het scheidingsteken, een
 * aanhalingsteken of een regeleinde erin worden netjes ingepakt.
 */
export function toCsv(rows: (string | number | null | undefined)[][], delimiter = ';'): string {
  const escape = (value: string | number | null | undefined): string => {
    const text = value === null || value === undefined ? '' : String(value);
    if (text.includes(delimiter) || text.includes('"') || text.includes('\n') || text.includes('\r')) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  };

  // CRLF omdat Excel daarop rekent.
  return rows.map(row => row.map(escape).join(delimiter)).join('\r\n');
}

/**
 * Biedt een CSV-bestand aan als download. De BOM zorgt dat Excel accenten in
 * namen als "Rumeysa Karaarslan" of "José" goed weergeeft.
 */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][], delimiter = ';'): void {
  downloadBestand(filename, BOM + toCsv(rows, delimiter), 'text/csv;charset=utf-8;');
}

/**
 * Controleert of de kopregel overeenkomt met het sjabloon. Hoofdletters,
 * spaties en een eventuele BOM worden genegeerd, zodat een gebruiker die de
 * kolommen niet aanpast maar wel opnieuw opslaat geen foutmelding krijgt.
 */
export function headersMatch(headers: string[], expected: string[]): boolean {
  const normalize = (value: string) => value.replace(/^﻿/, '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (headers.length < expected.length) return false;
  return expected.every((column, index) => normalize(headers[index] ?? '') === normalize(column));
}
