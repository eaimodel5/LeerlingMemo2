import os

file_path = "src/app/utils/docent-identiteit.ts"
with open(file_path, "r") as f:
    content = f.read()

import re
pattern = r"export function bouwDocentIdentiteitVelden\([\s\S]*?return velden;\n\}"
replacement = """export function bouwDocentIdentiteitVelden(
  bron: DocentIdentiteitDrager | null | undefined,
  standaardEmail = ''
): { docentAfkorting: string; docentEmail: string } {
  const opgelost = losDocentIdentiteitOp(bron);
  
  if (!opgelost.docentAfkorting) {
    throw new Error('Nieuwe functionele records vereisen een canonieke docentAfkorting (PR9).');
  }
  
  const email = opgelost.fallbackEmail || standaardEmail;

  return {
    docentAfkorting: opgelost.docentAfkorting,
    docentEmail: email,
  };
}"""

content = re.sub(pattern, replacement, content)

with open(file_path, "w") as f:
    f.write(content)
