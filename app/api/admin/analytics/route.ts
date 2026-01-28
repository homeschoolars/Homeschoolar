import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function getRange(range: string) {
  const now = new Date()
  switch (range) {
    case "7d":
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), bucket: "day" as const }
    case "90d":
      return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), bucket: "month" as const }
    case "1y":
      return { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), bucket: "month" as const }
    case "30d":
    default:
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), bucket: "day" as const }
  }
}

export async function GET(request: Request) {
  try {
    // Prevent execution during build time
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json(
        { error: "This endpoint is not available during build time" },
        { status: 503 }
      )
    }

    await requireRole("admin")
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") ?? "30d"
    const { start, bucket } = getRange(range)

    const [
      totalUsers,
      activeSubscribers,
      worksheetsGenerated,
      quizzesTaken,
      revenueSum,
      avgCompletionRate,
      planCounts,
      userGrowthRows,
      subscriberGrowthRows,
      revenueRows,
      subjectEngagementRows,
      aiUsageRows,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.worksheet.count(),
      prisma.surpriseQuiz.count(),
      prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { status: "succeeded" } }),
      prisma.progress.aggregate({ _avg: { averageScore: true } }),
      prisma.subscription.groupBy({
        by: ["plan"],
        _count: { _all: true },
        where: { status: "active" },
      }),
      prisma.$queryRaw<{ period: Date; users: number }[]>(Prisma.sql`
        SELECT date_trunc(${Prisma.raw(`'${bucket}'`)}, created_at) AS period,
               COUNT(*)::int AS users
        FROM profiles
        WHERE created_at >= ${start}
        GROUP BY 1
        ORDER BY 1
      `),
      prisma.$queryRaw<{ period: Date; subscribers: number }[]>(Prisma.sql`
        SELECT date_trunc(${Prisma.raw(`'${bucket}'`)}, created_at) AS period,
               COUNT(*)::int AS subscribers
        FROM subscriptions
        WHERE created_at >= ${start} AND status = 'active'
        GROUP BY 1
        ORDER BY 1
      `),
      prisma.$queryRaw<{ period: Date; revenue: number }[]>(Prisma.sql`
        SELECT date_trunc(${Prisma.raw(`'${bucket}'`)}, created_at) AS period,
               COALESCE(SUM(amount), 0)::int AS revenue
        FROM payment_transactions
        WHERE created_at >= ${start} AND status = 'succeeded'
        GROUP BY 1
        ORDER BY 1
      `),
      prisma.$queryRaw<{ subject: string; started: number; completed: number }[]>(Prisma.sql`
        SELECT s.name AS subject,
               COUNT(DISTINCT a.id)::int AS started,
               COUNT(DISTINCT sub.id)::int AS completed
        FROM subjects s
        LEFT JOIN worksheets w ON w.subject_id = s.id
        LEFT JOIN worksheet_assignments a ON a.worksheet_id = w.id
        LEFT JOIN worksheet_submissions sub ON sub.assignment_id = a.id
        GROUP BY s.name
        ORDER BY s.name
      `),
      prisma.$queryRaw<{ day: Date; event_type: string; count: number }[]>(Prisma.sql`
        SELECT date_trunc('day', created_at) AS day,
               event_type,
               COUNT(*)::int AS count
        FROM analytics_events
        WHERE created_at >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)}
          AND event_type LIKE 'ai.%'
        GROUP BY 1, 2
        ORDER BY 1
      `),
    ])

    const userGrowthMap = new Map<string, { date: string; users: number; subscribers: number }>()
    for (const row of userGrowthRows) {
      const key = row.period.toISOString().slice(0, 10)
      userGrowthMap.set(key, { date: key, users: row.users, subscribers: 0 })
    }
    for (const row of subscriberGrowthRows) {
      const key = row.period.toISOString().slice(0, 10)
      const entry = userGrowthMap.get(key) ?? { date: key, users: 0, subscribers: 0 }
      entry.subscribers = row.subscribers
      userGrowthMap.set(key, entry)
    }

    const aiUsageMap = new Map<string, { date: string; worksheets: number; quizzes: number; recommendations: number }>()
    for (const row of aiUsageRows) {
      const key = row.day.toISOString().slice(0, 10)
      const entry = aiUsageMap.get(key) ?? { date: key, worksheets: 0, quizzes: 0, recommendations: 0 }
      const type = row.event_type
      if (type.includes("worksheet")) entry.worksheets += row.count
      if (type.includes("quiz")) entry.quizzes += row.count
      if (type.includes("recommend")) entry.recommendations += row.count
      aiUsageMap.set(key, entry)
    }

    return NextResponse.json({
      stats: {
        totalUsers,
        activeSubscribers,
        totalRevenue: revenueSum._sum.amount ?? 0,
        worksheetsGenerated,
        quizzesTaken,
        avgCompletionRate: Math.round(Number(avgCompletionRate._avg.averageScore ?? 0)),
      },
      userGrowthData: Array.from(userGrowthMap.values()),
      revenueData: revenueRows.map((row) => ({ date: row.period.toISOString().slice(0, 10), revenue: row.revenue })),
      planDistribution: planCounts.map((plan) => ({ name: plan.plan, value: plan._count._all })),
      subjectEngagement: subjectEngagementRows,
      aiUsageData: Array.from(aiUsageMap.values()),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load analytics"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
