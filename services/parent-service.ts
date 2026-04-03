import { prisma } from "@/lib/prisma"
import type { AgeGroup } from "@prisma/client"

export async function getParentDashboardData(userId: string) {
  const [profile, children, allSubjects, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.child.findMany({ where: { parentId: userId }, orderBy: { createdAt: "asc" } }),
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
  const subjectsByAgeGroup = Object.fromEntries(ageGroups.map((age) => [age, [] as typeof allSubjects]))

  for (const curriculumSubject of curriculumSubjects) {
    const ageGroupName = curriculumAgeGroupIdToName.get(curriculumSubject.ageGroupId)
    if (!ageGroupName) continue

    const resolvedBaseSubject =
      curriculumSubject.baseSubject ?? baseSubjectByName.get(curriculumSubject.name.trim().toLowerCase()) ?? null
    if (!resolvedBaseSubject) continue

    const existing = subjectsByAgeGroup[ageGroupName]
    if (!existing.some((subject) => subject.id === resolvedBaseSubject.id)) {
      existing.push(resolvedBaseSubject)
    }
  }

  // Fallback: if imported curriculum is missing mappings for an age group,
  // keep existing behavior by showing canonical subjects.
  for (const ageGroupName of ageGroups) {
    if (!subjectsByAgeGroup[ageGroupName] || subjectsByAgeGroup[ageGroupName].length === 0) {
      subjectsByAgeGroup[ageGroupName] = [...allSubjects]
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
