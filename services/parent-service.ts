import { prisma } from "@/lib/prisma"
import type { AgeGroup } from "@prisma/client"

export async function getParentDashboardData(userId: string) {
  const [profile, children, subjects, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.child.findMany({ where: { parentId: userId }, orderBy: { createdAt: "asc" } }),
    prisma.subject.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.subscription.findFirst({ where: { userId } }),
  ])

  return { profile, children, subjects, subscription }
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
