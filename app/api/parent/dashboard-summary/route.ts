import { auth } from "@/auth"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Family-level stats for the parent dashboard hero cards (all children of the parent).
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "parent") {
      return fail("Forbidden", 403)
    }

    const kids = await prisma.child.findMany({
      where: { parentId: session.user.id },
      select: { id: true },
    })
    const childIds = kids.map((c) => c.id)

    if (childIds.length === 0) {
      return ok({ worksheetsAssigned: 0, averageScorePct: 0, thisWeekActivity: 0 })
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [assignmentCount, surpriseQuizzes, studentWorksheets, submissions] = await Promise.all([
      prisma.worksheetAssignment.count({ where: { childId: { in: childIds } } }),
      prisma.surpriseQuiz.findMany({
        where: {
          childId: { in: childIds },
          completedAt: { not: null },
          maxScore: { not: null, gt: 0 },
        },
        select: { score: true, maxScore: true },
      }),
      prisma.studentWorksheet.findMany({
        where: { studentId: { in: childIds }, percentage: { not: null } },
        select: { percentage: true },
      }),
      prisma.worksheetSubmission.findMany({
        where: { childId: { in: childIds }, maxScore: { not: null, gt: 0 } },
        select: { score: true, maxScore: true },
      }),
    ])

    const percents: number[] = []
    for (const q of surpriseQuizzes) {
      const max = Number(q.maxScore)
      const sc = Number(q.score ?? 0)
      if (max > 0) percents.push((sc / max) * 100)
    }
    for (const w of studentWorksheets) {
      if (w.percentage != null) percents.push(Number(w.percentage))
    }
    for (const s of submissions) {
      const max = Number(s.maxScore)
      const sc = Number(s.score ?? 0)
      if (max > 0) percents.push((sc / max) * 100)
    }

    const averageScorePct = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0

    const [weekSubs, weekSurprise, weekStudentWs] = await Promise.all([
      prisma.worksheetSubmission.count({
        where: { childId: { in: childIds }, submittedAt: { gte: sevenDaysAgo } },
      }),
      prisma.surpriseQuiz.count({
        where: { childId: { in: childIds }, completedAt: { gte: sevenDaysAgo } },
      }),
      prisma.studentWorksheet.count({
        where: { studentId: { in: childIds }, createdAt: { gte: sevenDaysAgo } },
      }),
    ])

    const thisWeekActivity = weekSubs + weekSurprise + weekStudentWs

    return ok({
      worksheetsAssigned: assignmentCount,
      averageScorePct,
      thisWeekActivity,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load summary"
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
