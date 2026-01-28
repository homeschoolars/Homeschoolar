import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { enforceParentChildAccess } from "@/lib/auth-helpers"
import { auth } from "@/auth"

// Force dynamic rendering - this route makes database calls
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const XP_PER_WORKSHEET = 10
const XP_PER_QUIZ = 20
const XP_PER_LEVEL = 100
const STARS_PER_WORKSHEET = 5
const STARS_PER_QUIZ = 10
const COINS_PER_WORKSHEET = 2
const COINS_PER_QUIZ = 5
const DAILY_GOAL_ACTIVITIES = 3

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("childId")
    if (!childId) {
      return NextResponse.json({ error: "childId required" }, { status: 400 })
    }

    const session = await auth()
    await enforceParentChildAccess(childId, session)

    const [progressRows, quizCount, submissionDays, quizDays] = await Promise.all([
      prisma.progress.findMany({
        where: { childId },
        select: { completedWorksheets: true },
      }),
      prisma.surpriseQuiz.count({
        where: { childId, completedAt: { not: null } },
      }),
      prisma.$queryRaw<{ d: string }[]>`
        SELECT DISTINCT (date_trunc('day', submitted_at))::date::text AS d
        FROM worksheet_submissions WHERE child_id = ${childId}
        AND submitted_at >= ${new Date(Date.now() - 32 * 24 * 60 * 60 * 1000)}
        ORDER BY 1 DESC
      `,
      prisma.$queryRaw<{ d: string }[]>`
        SELECT DISTINCT (date_trunc('day', completed_at))::date::text AS d
        FROM surprise_quizzes WHERE child_id = ${childId}
        AND completed_at IS NOT NULL
        AND completed_at >= ${new Date(Date.now() - 32 * 24 * 60 * 60 * 1000)}
        ORDER BY 1 DESC
      `,
    ])

    const worksheetsCompleted = progressRows.reduce((s, r) => s + r.completedWorksheets, 0)
    const xp = worksheetsCompleted * XP_PER_WORKSHEET + quizCount * XP_PER_QUIZ
    const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1)
    const stars = worksheetsCompleted * STARS_PER_WORKSHEET + quizCount * STARS_PER_QUIZ
    const coins = worksheetsCompleted * COINS_PER_WORKSHEET + quizCount * COINS_PER_QUIZ

    const allDays = [...new Set([...submissionDays.map((r) => r.d), ...quizDays.map((r) => r.d)])].sort().reverse()
    let streak = 0
    for (let i = 0; i < allDays.length; i++) {
      const expected = new Date()
      expected.setDate(expected.getDate() - i)
      const want = expected.toISOString().slice(0, 10)
      if (allDays[i] === want) streak += 1
      else break
    }

    const today = new Date().toISOString().slice(0, 10)
    const hasWorksheetToday = submissionDays.some((r) => r.d === today)
    const hasQuizToday = quizDays.some((r) => r.d === today)
    const worksheetToday = hasWorksheetToday ? 1 : 0
    const quizToday = hasQuizToday ? 1 : 0
    const completedToday = worksheetToday + quizToday

    const totalXp = xp
    const xpInLevel = xp % XP_PER_LEVEL
    const xpToNextLevel = XP_PER_LEVEL - xpInLevel

    const quests = [
      {
        id: "worksheet",
        title: "Complete 1 worksheet",
        done: worksheetsCompleted >= 1,
        today: hasWorksheetToday,
        current: worksheetsCompleted,
        target: 1,
        xp: XP_PER_WORKSHEET,
        coins: COINS_PER_WORKSHEET,
      },
      {
        id: "quiz",
        title: "Pass 1 quiz",
        done: quizCount >= 1,
        today: hasQuizToday,
        current: quizCount,
        target: 1,
        xp: XP_PER_QUIZ,
        coins: COINS_PER_QUIZ,
      },
      {
        id: "xp",
        title: "Earn 30 XP today",
        done: (worksheetToday * XP_PER_WORKSHEET + quizToday * XP_PER_QUIZ) >= 30,
        today: (worksheetToday * XP_PER_WORKSHEET + quizToday * XP_PER_QUIZ) >= 30,
        current: worksheetToday * XP_PER_WORKSHEET + quizToday * XP_PER_QUIZ,
        target: 30,
        xp: 5,
        coins: 1,
      },
    ]

    return NextResponse.json({
      xp: totalXp,
      level,
      stars,
      coins,
      streak,
      worksheetsCompleted,
      quizCount,
      quests,
      completedToday,
      dailyGoal: DAILY_GOAL_ACTIVITIES,
      dailyGoalProgress: Math.min(completedToday, DAILY_GOAL_ACTIVITIES),
      xpToNextLevel,
      xpInLevel,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load gamification"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
