import { prisma } from "@/lib/prisma"
import type { AgeGroup } from "@prisma/client"
import { toApiAgeGroup } from "@/lib/age-group"
import { syncAllChildrenAgeGroupsForParent } from "@/lib/child-age-sync"

export async function getParentDashboardData(userId: string) {
  await syncAllChildrenAgeGroupsForParent(userId)

  const [profile, children, allSubjects, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.child.findMany({
      where: { parentId: userId },
      orderBy: { createdAt: "asc" },
      include: { profile: { select: { dateOfBirth: true } } },
    }),
    prisma.subject.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.subscription.findFirst({ where: { userId } }),
  ])

  const ageGroups = Array.from(new Set(children.map((child) => child.ageGroup)))
  const curriculumAgeGroups = await prisma.curriculumAgeGroup.findMany({
    where: { name: { in: ageGroups } },
    select: { id: true, name: true },
  })

  const curriculumAgeGroupIdToName = new Map(curriculumAgeGroups.map((age) => [age.id, age.name]))
  const curriculumSubjects = await prisma.curriculumSubject.findMany({
    where: {
      ageGroupId: { in: curriculumAgeGroups.map((age) => age.id) },
    },
    include: {
      baseSubject: true,
    },
    orderBy: [{ ageGroupId: "asc" }, { displayOrder: "asc" }],
  })

  const baseSubjectByName = new Map(allSubjects.map((subject) => [subject.name.trim().toLowerCase(), subject]))
  const subjectsByAgeGroup = Object.fromEntries(ageGroups.map((age) => [toApiAgeGroup(age), [] as typeof allSubjects]))

  for (const curriculumSubject of curriculumSubjects) {
    const prismaAgeName = curriculumAgeGroupIdToName.get(curriculumSubject.ageGroupId) as AgeGroup | undefined
    if (!prismaAgeName) continue
    const apiAgeKey = toApiAgeGroup(prismaAgeName)

    const resolvedBaseSubject =
      curriculumSubject.baseSubject ?? baseSubjectByName.get(curriculumSubject.name.trim().toLowerCase()) ?? null
    if (!resolvedBaseSubject) continue

    const existing = subjectsByAgeGroup[apiAgeKey]
    if (!existing.some((subject) => subject.id === resolvedBaseSubject.id)) {
      existing.push(resolvedBaseSubject)
    }
  }

  // Fallback: if imported curriculum is missing mappings for an age group,
  // keep existing behavior by showing canonical subjects.
  for (const ageGroupEnum of ageGroups) {
    const apiKey = toApiAgeGroup(ageGroupEnum)
    if (!subjectsByAgeGroup[apiKey] || subjectsByAgeGroup[apiKey].length === 0) {
      subjectsByAgeGroup[apiKey] = [...allSubjects]
    }
  }

  return { profile, children, subjects: allSubjects, subjectsByAgeGroup, subscription }
}

export async function createChild({
  parentId,
  name,
  ageGroup,
  loginCode,
}: {
  parentId: string
  name: string
  ageGroup: AgeGroup
  loginCode: string
}) {
  return prisma.child.create({
    data: {
      parentId,
      name,
      ageGroup,
      loginCode,
    },
  })
}
