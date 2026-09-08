import os

file_path = "src/app/utils/toegangscode.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
"""export function sessieMoetStoppen(
  bestaat: boolean,
  data?: Pick<AccessCode, 'active' | 'used'> | null,
): boolean {
  if (!bestaat) return true;
  return !isActieveCode(data);
}""",
"""export function sessieMoetStoppen(
  bestaat: boolean,
  data?: Pick<AccessCode, 'active' | 'used' | 'docentAfkorting'> | null,
): boolean {
  if (!bestaat) return true;
  if (!isActieveCode(data)) return true;
  if (!data?.docentAfkorting) return true; // PR9 vereist docentAfkorting
  return false;
}"""
)

with open(file_path, "w") as f:
    f.write(content)
