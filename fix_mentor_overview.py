import os
import re

file_path = "src/app/pages/mentor-overview.component.ts"
with open(file_path, "r") as f:
    content = f.read()

# Mentor overview component zetTakenUitVoorKlas fixes for bouwDocentIdentiteitVelden
# The function was relying on old fallback behavior which now throws.
# Since it's for existing DocentVak we need to ensure it's either skipped or handled.

content = content.replace(
"""          const idVelden = bouwDocentIdentiteitVelden(cel.kolom);""",
"""          let idVelden;
          try {
            idVelden = bouwDocentIdentiteitVelden(cel.kolom);
          } catch (e) {
            // Sla over als docentAfkorting ontbreekt in deze oude data
            continue;
          }"""
)

content = content.replace(
"""        const idVelden = bouwDocentIdentiteitVelden(docentVak);""",
"""        let idVelden;
        try {
          idVelden = bouwDocentIdentiteitVelden(docentVak);
        } catch (e) {
          // Sla over als docentAfkorting ontbreekt in deze oude data
          return null;
        }"""
)

with open(file_path, "w") as f:
    f.write(content)

