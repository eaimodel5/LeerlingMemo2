import os

file_path = "src/app/utils/docent-identiteit.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
"""export function bouwDocentIdentiteitVelden(
  bron: DocentIdentiteitDrager | null | undefined,
  standaardEmail = ''
): { docentAfkorting?: string; docentEmail: string } {
  const opgelost = losDocentIdentiteitOp(bron);
  const email = opgelost.fallbackEmail || standaardEmail;

  const velden: { docentAfkorting?: string; docentEmail: string } = {
    docentEmail: email,
  };

  if (opgelost.docentAfkorting) {
    velden.docentAfkorting = opgelost.docentAfkorting;
  }

  return velden;
}""",
"""export function bouwDocentIdentiteitVelden(
  bron: DocentIdentiteitDrager | null | undefined,
  standaardEmail = ''
): { docentAfkorting: string; docentEmail: string } {
  const opgelost = losDocentIdentiteitOp(bron);
  if (!opgelost.docentAfkorting) {
    throw new Error('PR9: docentAfkorting is vereist voor het schrijven van identiteitsvelden.');
  }
  const email = opgelost.fallbackEmail || standaardEmail;

  return {
    docentAfkorting: opgelost.docentAfkorting,
    docentEmail: email,
  };
}"""
)

with open(file_path, "w") as f:
    f.write(content)

