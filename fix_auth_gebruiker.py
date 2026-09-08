import os

file_path = "src/app/services/auth.service.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
"""      const gebruiker: AuthUser = {
        name: data.ownerName,
        email: data.ownerEmail,
        role: data.role,
        vak: data.vak,
        code: snap.id,
        ...(data.docentAfkorting ? { docentAfkorting: data.docentAfkorting } : {}),
      };""",
"""      const gebruiker: AuthUser = {
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
