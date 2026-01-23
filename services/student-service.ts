import { prisma } from "@/lib/prisma"

export async function findChildByLoginCode(loginCode: string) {
  return prisma.child.findUnique({
    where: { loginCode },
  })
}

export async function getStudentDashboard(childId: string) {
  const [subjects, assignments, progress, child] = await Promise.all([
    prisma.subject.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.worksheetAssignment.findMany({
      where: { childId, status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { worksheet: true },
    }),
    prisma.progress.findMany({ where: { childId } }),
    prisma.child.findUnique({ where: { id: childId } }),
  ])

  return {
    subjects,
    assignments,
    progress,
    child,
  }
}
