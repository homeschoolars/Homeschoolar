import "server-only"
import { prisma } from "@/lib/prisma"
import type { LearningLevel } from "@prisma/client"

function scoreToDelta(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0
  const ratio = score / maxScore
  if (ratio >= 0.85) return 1
  if (ratio >= 0.6) return 0
  return -1
}

function applyLevel(current: LearningLevel, delta: number): LearningLevel {
  const order: LearningLevel[] = ["beginner", "intermediate", "advanced"]
  const idx = order.indexOf(current)
  const next = Math.min(2, Math.max(0, idx + delta))
  return order[next]!
}

/**
 * Updates Child.currentLevel from quiz / worksheet outcomes (rolling, lightweight).
 */
export async function recordAdaptivePerformance(params: {
  studentId: string
  score: number
  maxScore: number
  source: "lesson_quiz" | "worksheet"
}) {
  const child = await prisma.child.findUnique({
    where: { id: params.studentId },
    select: { currentLevel: true },
  })
  if (!child) return

  const delta = scoreToDelta(params.score, params.maxScore)
  if (delta === 0 && params.source === "worksheet") {
    return
  }

  const next = applyLevel(child.currentLevel, delta)
  if (next === child.currentLevel) return

  await prisma.child.update({
    where: { id: params.studentId },
    data: {
      currentLevel: next,
      ...(params.source === "lesson_quiz" ? { lastQuizAt: new Date() } : {}),
    },
  })
}
