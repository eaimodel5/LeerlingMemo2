import os

# fix inlogfout.ts
file_path = "src/app/utils/inlogfout.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    "  | 'code-ingetrokken'",
    "  | 'code-ingetrokken'\n  | 'code-incompleet'"
)
content = content.replace(
    "  'code-ingetrokken': 'Deze toegangscode is ingetrokken. Vraag de beheerder om een nieuwe.',",
    "  'code-ingetrokken': 'Deze toegangscode is ingetrokken. Vraag de beheerder om een nieuwe.',\n  'code-incompleet': 'Deze toegangscode mist een vereiste docentkoppeling (PR9).',",
)

with open(file_path, "w") as f:
    f.write(content)

# fix auth.service.ts
file_path = "src/app/services/auth.service.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
"""      const data = snap.data() as AccessCode;
      if (!isActieveCode(data)) return fout('code-ingetrokken');

      const gebruiker: AuthUser = {""",
"""      const data = snap.data() as AccessCode;
      if (!isActieveCode(data)) return fout('code-ingetrokken');
      if (!data.docentAfkorting) return fout('code-incompleet'); // PR9

      const gebruiker: AuthUser = {"""
)

content = content.replace(
"""      // De rol en personeelsidentiteit komen uit het code-document, niet uit
      // de browseropslag: is de code gewijzigd of voorzien van een afkorting,
      // dan geldt de waarde uit Firestore.
      const data = snap.data() as AccessCode;
      const bijgewerkt: AuthUser = {
        name: data.ownerName,
        email: data.ownerEmail,
        role: data.role,
        vak: data.vak,
        code: snap.id,
        ...(data.docentAfkorting ? { docentAfkorting: data.docentAfkorting } : {}),
      };""",
"""      // De rol en personeelsidentiteit komen uit het code-document, niet uit
      // de browseropslag: is de code gewijzigd of voorzien van een afkorting,
      // dan geldt de waarde uit Firestore.
      const data = snap.data() as AccessCode;
      
      // PR9: actieve sessie zonder geldige docentAfkorting is niet meer toegestaan
      if (!data.docentAfkorting) {
        await this.logout();
        return;
      }

      const bijgewerkt: AuthUser = {
        name: data.ownerName,
        email: data.ownerEmail,
        role: data.role,
        vak: data.vak,
        code: snap.id,
        docentAfkorting: data.docentAfkorting,
      };"""
)

with open(file_path, "w") as f:
    f.write(content)

