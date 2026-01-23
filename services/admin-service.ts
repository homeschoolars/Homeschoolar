import { prisma } from "@/lib/prisma"

export async function getAdminDashboardData() {
  const [usersCount, childrenCount, worksheetsCount, pendingWorksheets, recentUsers, subjects] = await Promise.all([
    prisma.user.count(),
    prisma.child.count(),
    prisma.worksheet.count(),
    prisma.worksheet.findMany({ where: { isApproved: false }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.subject.findMany({ orderBy: { displayOrder: "asc" } }),
  ])

  return { usersCount, childrenCount, worksheetsCount, pendingWorksheets, recentUsers, subjects }
}
