import { describe, expect, it } from 'vitest';
import {
  bouwDocentIdentiteitVelden,
  filterVoorDocent,
  heeftDocentKoppeling,
  komtDocentOvereen,
  losDocentIdentiteitOp,
  vindVoorDocent,
} from './docent-identiteit';

describe('docent-identiteit helper & resolver (PR 7)', () => {
  describe('losDocentIdentiteitOp', () => {
    it('herkent een moderne identiteit met geldige docentAfkorting', () => {
      const opgelost = losDocentIdentiteitOp({
        docentAfkorting: 'vis',
        docentEmail: 'visser@school.nl',
      });

      expect(opgelost.soort).toBe('afkorting');
      expect(opgelost.sleutel).toBe('vis');
      expect(opgelost.docentAfkorting).toBe('vis');
      expect(opgelost.fallbackEmail).toBe('visser@school.nl');
      expect(opgelost.isModern).toBe(true);
    });

    it('normaliseert afkorting naar kleine letters en trimt witruimte', () => {
      const opgelost = losDocentIdentiteitOp({
        docentAfkorting: '  VIS  ',
        email: 'VISSER@SCHOOL.NL',
      });

      expect(opgelost.soort).toBe('afkorting');
      expect(opgelost.sleutel).toBe('vis');
      expect(opgelost.docentAfkorting).toBe('vis');
      expect(opgelost.fallbackEmail).toBe('visser@school.nl');
      expect(opgelost.isModern).toBe(true);
    });

    it('werkt ook voor een moderne identiteit zonder e-mailadres', () => {
      const opgelost = losDocentIdentiteitOp({ docentAfkorting: 'bak' });

      expect(opgelost.soort).toBe('afkorting');
      expect(opgelost.sleutel).toBe('bak');
      expect(opgelost.docentAfkorting).toBe('bak');
      expect(opgelost.fallbackEmail).toBeNull();
      expect(opgelost.isModern).toBe(true);
    });

    it('herkent legacy data zonder afkorting en valt terug op e-mail', () => {
      const opgelost = losDocentIdentiteitOp({
        docentEmail: 'jansen@school.nl',
      });

      expect(opgelost.soort).toBe('email');
      expect(opgelost.sleutel).toBe('jansen@school.nl');
      expect(opgelost.docentAfkorting).toBeNull();
      expect(opgelost.fallbackEmail).toBe('jansen@school.nl');
      expect(opgelost.isModern).toBe(false);
    });

    it('NOOIT afkorting raden uit e-mail of naam bij legacy data', () => {
      const opgelost = losDocentIdentiteitOp({
        docentNaam: 'Hans Visser',
        email: 'vis@school.nl',
      });

      // Zelfs al heet het adres 'vis@...', we raden NOOIT dat de afkorting 'vis' is.
      expect(opgelost.soort).toBe('email');
      expect(opgelost.sleutel).toBe('vis@school.nl');
      expect(opgelost.docentAfkorting).toBeNull();
      expect(opgelost.fallbackEmail).toBe('vis@school.nl');
      expect(opgelost.isModern).toBe(false);
    });

    it('behandelt ongeldige afkorting als afwezig en valt terug op e-mail', () => {
      const opgelost = losDocentIdentiteitOp({
        docentAfkorting: 'ongeldig!tekens', // leestekens niet toegestaan
        docentEmail: 'leraar@school.nl',
      });

      expect(opgelost.soort).toBe('email');
      expect(opgelost.sleutel).toBe('leraar@school.nl');
      expect(opgelost.docentAfkorting).toBeNull();
      expect(opgelost.isModern).toBe(false);
    });

    it('geeft onbekend terug bij null, undefined of leeg object', () => {
      expect(losDocentIdentiteitOp(null).soort).toBe('onbekend');
      expect(losDocentIdentiteitOp(undefined).soort).toBe('onbekend');
      expect(losDocentIdentiteitOp({}).soort).toBe('onbekend');
      expect(losDocentIdentiteitOp({ docentNaam: 'Alleen Een Naam' }).soort).toBe('onbekend');
    });

    it('ondersteunt directe strings (afkorting of e-mailadres)', () => {
      const afk = losDocentIdentiteitOp('vis');
      expect(afk.soort).toBe('afkorting');
      expect(afk.docentAfkorting).toBe('vis');

      const mail = losDocentIdentiteitOp('docent@school.nl');
      expect(mail.soort).toBe('email');
      expect(mail.fallbackEmail).toBe('docent@school.nl');
    });
  });

  describe('komtDocentOvereen', () => {
    describe('Nieuwe data (beide modern)', () => {
      it('geeft true bij gelijke afkortingen (hoofdletterongevoelig)', () => {
        expect(
          komtDocentOvereen(
            { docentAfkorting: 'VIS', docentEmail: 'visser@school.nl' },
            { docentAfkorting: 'vis', docentEmail: 'visser@school.nl' }
          )
        ).toBe(true);
      });

      it('geeft false bij verschillende afkortingen, zelfs als e-mail hetzelfde is', () => {
        // Docentafkorting is leidend. Als beide een afkorting hebben, telt alleen de afkorting.
        expect(
          komtDocentOvereen(
            { docentAfkorting: 'vis', docentEmail: 'gedeeld@school.nl' },
            { docentAfkorting: 'bak', docentEmail: 'gedeeld@school.nl' }
          )
        ).toBe(false);
      });
    });

    describe('Oude data (beide legacy)', () => {
      it('geeft true bij gelijke e-mailadressen (hoofdletterongevoelig)', () => {
        expect(
          komtDocentOvereen(
            { docentEmail: 'Jansen@School.NL' },
            { docentEmail: 'jansen@school.nl' }
          )
        ).toBe(true);
      });

      it('geeft false bij verschillende e-mailadressen', () => {
        expect(
          komtDocentOvereen(
            { docentEmail: 'jansen@school.nl' },
            { docentEmail: 'pietersen@school.nl' }
          )
        ).toBe(false);
      });
    });

    describe('Gemengde data (overgangssituatie modern vs legacy)', () => {
      it('geeft true wanneer de moderne gebruiker via fallbackEmail matcht met een legacy record', () => {
        const ingelogdeDocent = {
          docentAfkorting: 'vis',
          email: 'visser@school.nl',
        };
        const legacyTaak = {
          docentEmail: 'visser@school.nl',
          // geen docentAfkorting
        };

        expect(komtDocentOvereen(ingelogdeDocent, legacyTaak)).toBe(true);
        expect(komtDocentOvereen(legacyTaak, ingelogdeDocent)).toBe(true);
      });

      it('geeft false wanneer de e-mailadressen in een gemengde situatie niet overeenkomen', () => {
        const ingelogdeDocent = {
          docentAfkorting: 'vis',
          email: 'visser@school.nl',
        };
        const legacyTaak = {
          docentEmail: 'iemandanders@school.nl',
        };

        expect(komtDocentOvereen(ingelogdeDocent, legacyTaak)).toBe(false);
      });

      it('geeft false wanneer de moderne kant geen e-mailadres heeft om mee te vergelijken', () => {
        const modernZonderMail = { docentAfkorting: 'vis' };
        const legacyTaak = { docentEmail: 'visser@school.nl' };

        // Nooit raden!
        expect(komtDocentOvereen(modernZonderMail, legacyTaak)).toBe(false);
      });
    });

    describe('Ongeldige of onbekende data', () => {
      it('geeft false als één van beide onbekend is', () => {
        expect(komtDocentOvereen({ docentAfkorting: 'vis' }, null)).toBe(false);
        expect(komtDocentOvereen(null, { docentEmail: 'test@school.nl' })).toBe(false);
        expect(komtDocentOvereen({}, {})).toBe(false);
      });
    });
  });

  describe('Collectie-helpers (filterVoorDocent, vindVoorDocent, heeftDocentKoppeling)', () => {
    const taken = [
      { id: 't1', docentAfkorting: 'vis', docentEmail: 'visser@school.nl', vak: 'Wiskunde' },
      { id: 't2', docentEmail: 'visser@school.nl', vak: 'Natuurkunde' }, // legacy taak van visser
      { id: 't3', docentAfkorting: 'jan', docentEmail: 'jansen@school.nl', vak: 'Nederlands' },
      { id: 't4', docentEmail: 'bakker@school.nl', vak: 'Engels' }, // legacy taak van bakker
    ];

    it('filterVoorDocent filtert zowel moderne als legacy taken voor een docent met afkorting en email', () => {
      const docentVis = { docentAfkorting: 'vis', email: 'visser@school.nl' };
      const result = filterVoorDocent(taken, docentVis);

      expect(result.map(t => t.id)).toEqual(['t1', 't2']);
    });

    it('filterVoorDocent filtert uitsluitend via afkorting als beide modern zijn', () => {
      const docentJan = { docentAfkorting: 'jan', email: 'ander@school.nl' };
      const result = filterVoorDocent(taken, docentJan);

      expect(result.map(t => t.id)).toEqual(['t3']);
    });

    it('filterVoorDocent werkt ook voor een legacy docent (zonder afkorting)', () => {
      const legacyDocent = { email: 'bakker@school.nl' };
      const result = filterVoorDocent(taken, legacyDocent);

      expect(result.map(t => t.id)).toEqual(['t4']);
    });

    it('vindVoorDocent vindt het eerste overeenkomstige item', () => {
      const docentVis = { docentAfkorting: 'vis', email: 'visser@school.nl' };
      const gevonden = vindVoorDocent(taken, docentVis);
      expect(gevonden?.id).toBe('t1');
    });

    it('heeftDocentKoppeling retourneert boolean', () => {
      expect(heeftDocentKoppeling(taken, { docentAfkorting: 'vis' })).toBe(true);
      expect(heeftDocentKoppeling(taken, { docentAfkorting: 'onbekend' })).toBe(false);
      expect(heeftDocentKoppeling(taken, null)).toBe(false);
    });
  });

  describe('bouwDocentIdentiteitVelden', () => {
    it('bouwt velden met zowel docentAfkorting als docentEmail voor moderne data', () => {
      const velden = bouwDocentIdentiteitVelden({
        docentAfkorting: 'vis',
        email: 'visser@school.nl',
      });

      expect(velden).toEqual({
        docentAfkorting: 'vis',
        docentEmail: 'visser@school.nl',
      });
    });

    it('bouwt velden zonder docentAfkorting als deze ontbreekt (legacy)', () => {
      const velden = bouwDocentIdentiteitVelden(
        { email: 'jansen@school.nl' },
        'standaard@school.nl'
      );

      expect(velden).toEqual({
        docentEmail: 'jansen@school.nl',
      });
      expect(velden.docentAfkorting).toBeUndefined();
    });

    it('gebruikt standaardEmail indien geen adres gevonden', () => {
      const velden = bouwDocentIdentiteitVelden(
        { docentAfkorting: 'vis' },
        'fallback@school.nl'
      );

      expect(velden).toEqual({
        docentAfkorting: 'vis',
        docentEmail: 'fallback@school.nl',
      });
    });
  });
});
