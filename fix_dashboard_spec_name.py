import os
import re

file_path = "src/app/pages/teacher-dashboard.component.spec.ts"
with open(file_path, "r") as f:
    content = f.read()

# Fix the test names so it matches
content = content.replace(
"""  it('toont legacy taken via e-mailfallback voor een docent met afkorting en e-mail', () => {""",
"""  it('weigert in PR9 nog legacy taken via e-mailfallback voor een docent', () => {"""
)

with open(file_path, "w") as f:
    f.write(content)
