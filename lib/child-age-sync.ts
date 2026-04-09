import { prisma } from "@/lib/prisma"
import { calculateAgeYears, deriveAgeGroup } from "@/lib/onboarding-utils"
import { toPrismaAgeGroup, toCurriculumAgeGroupName } from "@/lib/age-group"

/** Keeps `Child.ageGroup` aligned with date of birth as birthdays pass. */
export async function syncChildAgeGroupFromProfile(childId: string): Promise<void> {
  const row = await prisma.child.findUnique({
    where: { id: childId },
    select: { ageGroup: true, profile: { select: { dateOfBirth: true } } },
  })
  if (!row?.profile?.dateOfBirth) return
  const y = calculateAgeYears(row.profile.dateOfBirth)
  const api = deriveAgeGroup(y)
  if (!api) return
  const next = toPrismaAgeGroup(api)
  if (next !== row.ageGroup) {
    const ag = await prisma.curriculumAgeGroup.findUnique({
      where: { name: toCurriculumAgeGroupName(next) },
      select: { id: true },
    })
    await prisma.child.update({
      where: { id: childId },
      data: { ageGroup: next, curriculumAgeGroupId: ag?.id ?? null },
    })
  }
}

export async function syncAllChildrenAgeGroupsForParent(parentId: string): Promise<void> {
  const children = await prisma.child.findMany({
    where: { parentId },
    select: { id: true },
  })
  await Promise.all(children.map((c) => syncChildAgeGroupFromProfile(c.id)))
}
