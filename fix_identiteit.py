import os

file_path = "src/app/utils/docent-identiteit.ts"
with open(file_path, "r") as f:
    content = f.read()

# Modify komtDocentOvereen
content = content.replace(
"""  // Situatie 2 en 3: Ten minste één is legacy (geen docentAfkorting)
  // Gebruik e-mailadres als tijdelijke fallback waar beide over een adres beschikken.
  if (idA.fallbackEmail && idB.fallbackEmail) {
    return zelfdeEmail(idA.fallbackEmail, idB.fallbackEmail);
  }""",
"""  // PR9: Geen fallback meer op e-mail. Alleen nog matchen op docentAfkorting."""
)

with open(file_path, "w") as f:
    f.write(content)

