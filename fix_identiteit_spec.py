import os

file_path = "src/app/utils/docent-identiteit.spec.ts"
with open(file_path, "r") as f:
    content = f.read()

# 'geeft true bij gelijke e-mailadressen (hoofdletterongevoelig)' -> false
content = content.replace(
"""      it('geeft true bij gelijke e-mailadressen (hoofdletterongevoelig)', () => {
        expect(
          komtDocentOvereen(
            { docentEmail: 'Jansen@school.nl' },
            { docentEmail: 'jansen@school.nl' }
          )
        ).toBe(true);
      });""",
"""      it('geeft false bij gelijke e-mailadressen in PR9', () => {
        expect(
          komtDocentOvereen(
            { docentEmail: 'Jansen@school.nl' },
            { docentEmail: 'jansen@school.nl' }
          )
        ).toBe(false);
      });"""
)

# 'geeft true wanneer de moderne gebruiker via fallbackEmail matcht met een legacy record'
content = content.replace(
"""      it('geeft true wanneer de moderne gebruiker via fallbackEmail matcht met een legacy record', () => {
        const ingelogdeDocent: AuthUser = {
          role: 'Docent',
          name: 'Hans Visser',
          email: 'visser@school.nl',
          docentAfkorting: 'vis',
        };
        const legacyTaak = {
          docentEmail: 'Visser@school.nl',
          // docentAfkorting ontbreekt
        };

        expect(komtDocentOvereen(ingelogdeDocent, legacyTaak)).toBe(true);
        expect(komtDocentOvereen(legacyTaak, ingelogdeDocent)).toBe(true);
      });""",
"""      it('geeft false wanneer de moderne gebruiker via fallbackEmail probeert te matchen met een legacy record in PR9', () => {
        const ingelogdeDocent: AuthUser = {
          role: 'Docent',
          name: 'Hans Visser',
          email: 'visser@school.nl',
          docentAfkorting: 'vis',
        };
        const legacyTaak = {
          docentEmail: 'Visser@school.nl',
          // docentAfkorting ontbreekt
        };

        expect(komtDocentOvereen(ingelogdeDocent, legacyTaak)).toBe(false);
        expect(komtDocentOvereen(legacyTaak, ingelogdeDocent)).toBe(false);
      });"""
)

# filterVoorDocent filtert zowel moderne als legacy taken voor een docent met afkorting en email
content = content.replace(
"""      it('filterVoorDocent filtert zowel moderne als legacy taken voor een docent met afkorting en email', () => {
        const docentVis = { docentAfkorting: 'vis', docentEmail: 'visser@school.nl' };
        const result = filterVoorDocent(taken, docentVis);

        expect(result.map(t => t.id)).toEqual(['t1', 't2']);
      });""",
"""      it('filterVoorDocent filtert alleen moderne taken voor een docent in PR9', () => {
        const docentVis = { docentAfkorting: 'vis', docentEmail: 'visser@school.nl' };
        const result = filterVoorDocent(taken, docentVis);

        expect(result.map(t => t.id)).toEqual(['t1']);
      });"""
)

# filterVoorDocent werkt ook voor een legacy docent (zonder afkorting)
content = content.replace(
"""      it('filterVoorDocent werkt ook voor een legacy docent (zonder afkorting)', () => {
        const legacyDocent = { docentEmail: 'bakker@school.nl' };
        const result = filterVoorDocent(taken, legacyDocent);

        expect(result.map(t => t.id)).toEqual(['t4']);
      });""",
"""      it('filterVoorDocent levert niets op voor een legacy docent zonder afkorting in PR9', () => {
        const legacyDocent = { docentEmail: 'bakker@school.nl' };
        const result = filterVoorDocent(taken, legacyDocent);

        expect(result.map(t => t.id)).toEqual([]);
      });"""
)

with open(file_path, "w") as f:
    f.write(content)

