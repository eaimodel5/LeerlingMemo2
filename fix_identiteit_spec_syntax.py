import os

file_path = "src/app/utils/docent-identiteit.spec.ts"
with open(file_path, "r") as f:
    content = f.read()

import re
pattern = r"it\('gooit een Error zonder docentAfkorting als deze ontbreekt \(PR9\)', \(\) => \{[\s\S]*?\}\);\n      expect\(velden\.docentAfkorting\)\.toBeUndefined\(\);\n    \}\);"
replacement = """it('gooit een Error zonder docentAfkorting als deze ontbreekt (PR9)', () => {
      expect(() => bouwDocentIdentiteitVelden(
        { email: 'jansen@school.nl' },
        'standaard@school.nl'
      )).toThrowError(/docentAfkorting/);
    });"""

content = re.sub(pattern, replacement, content)

with open(file_path, "w") as f:
    f.write(content)
