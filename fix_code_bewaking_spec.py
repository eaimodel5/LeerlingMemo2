import os

file_path = "src/app/utils/code-bewaking.spec.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    "meld: (bestaat: boolean, data?: { active?: boolean; used?: boolean })",
    "meld: (bestaat: boolean, data?: { active?: boolean; used?: boolean; docentAfkorting?: string })"
)

with open(file_path, "w") as f:
    f.write(content)
