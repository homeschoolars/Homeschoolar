import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { childId } = (await request.json()) as { childId?: string }
    if (!childId) {
      return NextResponse.json({ error: "Child ID is required" }, { status: 400 })
    }

    await enforceParentChildAccess(childId, session)

    const progressRows = await prisma.progress.findMany({
      where: { childId },
      select: {
        averageScore: true,
        completedWorksheets: true,
        subject: { select: { name: true } },
      },
    })

    const averageScore =
      progressRows.length > 0
        ? Math.round(progressRows.reduce((sum, row) => sum + Number(row.averageScore), 0) / progressRows.length)
        : 0

    const worksheetsCompleted = progressRows.reduce((sum, row) => sum + row.completedWorksheets, 0)

    const [weeklyProgressRows, submissionsByDay, quizzesByDay] = await Promise.all([
      prisma.$queryRaw<{ week: Date; score: number }[]>(Prisma.sql`
        SELECT date_trunc('week', submitted_at) AS week,
               COALESCE(AVG(CASE WHEN max_score > 0 THEN (score::float / max_score) * 100 END), 0)::float AS score
        FROM worksheet_submissions
        WHERE child_id = ${childId}
          AND submitted_at >= ${new Date(Date.now() - 42 * 24 * 60 * 60 * 1000)}
        GROUP BY 1
        ORDER BY 1
      `),
      prisma.$queryRaw<{ day: Date; count: number }[]>(Prisma.sql`
        SELECT date_trunc('day', submitted_at) AS day,
               COUNT(*)::int AS count
        FROM worksheet_submissions
        WHERE child_id = ${childId}
          AND submitted_at >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
        GROUP BY 1
        ORDER BY 1
      `),
      prisma.$queryRaw<{ day: Date; count: number }[]>(Prisma.sql`
        SELECT date_trunc('day', completed_at) AS day,
               COUNT(*)::int AS count
        FROM surprise_quizzes
        WHERE child_id = ${childId}
          AND completed_at IS NOT NULL
          AND completed_at >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
        GROUP BY 1
        ORDER BY 1
      `),
    ])

    const weeklyActivityMap = new Map<string, { day: string; worksheets: number; quizzes: number }>()
    const start = new Date()
    start.setDate(start.getDate() - 6)

    for (let i = 0; i < 7; i += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      const key = date.toISOString().slice(0, 10)
      weeklyActivityMap.set(key, {
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        worksheets: 0,
        quizzes: 0,
      })
    }

    for (const row of submissionsByDay) {
      const key = row.day.toISOString().slice(0, 10)
      const entry = weeklyActivityMap.get(key)
      if (entry) entry.worksheets = row.count
    }
    for (const row of quizzesByDay) {
      const key = row.day.toISOString().slice(0, 10)
      const entry = weeklyActivityMap.get(key)
      if (entry) entry.quizzes = row.count
    }

    const weeklyActivity = Array.from(weeklyActivityMap.values())
    const weeklyActivityCount = weeklyActivity.reduce((sum, row) => sum + row.worksheets + row.quizzes, 0)

    const recentScores = weeklyProgressRows.slice(-2).map((row) => row.score)
    const improvementPercent =
      recentScores.length === 2 && recentScores[0] > 0 ? Math.max(0, Math.round(recentScores[1] - recentScores[0])) : 0

    return NextResponse.json({
      summary: {
        averageScore,
        worksheetsCompleted,
        improvementPercent,
        weeklyActivityCount,
      },
      progressData: weeklyProgressRows.map((row) => ({
        week: row.week.toISOString().slice(0, 10),
        score: Math.round(row.score),
      })),
      subjectScores: progressRows.map((row) => ({
        subject: row.subject?.name || "Unknown",
        score: Math.round(Number(row.averageScore)),
        fullMark: 100,
      })),
      weeklyActivity,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
