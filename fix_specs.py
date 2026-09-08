import os

file_path = "src/app/utils/toegangscode.spec.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    "{ active: true, used: false }",
    "{ active: true, used: false, docentAfkorting: 'vis' }"
)
content = content.replace(
    "sessieMoetStoppen(true, {})",
    "sessieMoetStoppen(true, { docentAfkorting: 'vis' })"
)

with open(file_path, "w") as f:
    f.write(content)

file_path = "src/app/utils/code-bewaking.spec.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
    "{ active: true, used: false }",
    "{ active: true, used: false, docentAfkorting: 'vis' }"
)
content = content.replace(
    "abonnement.meld(true, {});",
    "abonnement.meld(true, { docentAfkorting: 'vis' });"
)
content = content.replace(
    "volg((melden: (bestaat: boolean, data?: Pick<AccessCode, 'active' | 'used'> | null) => void) => () => void, stopGevraagd: () => void)",
    "volg((melden: (bestaat: boolean, data?: Pick<AccessCode, 'active' | 'used' | 'docentAfkorting'> | null) => void) => () => void, stopGevraagd: () => void)"
)


with open(file_path, "w") as f:
    f.write(content)

