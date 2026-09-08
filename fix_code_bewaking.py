import os

file_path = "src/app/utils/code-bewaking.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
"""      melden: (bestaat: boolean, data?: Pick<AccessCode, 'active' | 'used'> | null) => void,""",
"""      melden: (bestaat: boolean, data?: Pick<AccessCode, 'active' | 'used' | 'docentAfkorting'> | null) => void,"""
)

with open(file_path, "w") as f:
    f.write(content)

