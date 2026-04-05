import "server-only"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { LearningLevel } from "@prisma/client"

type ScoreEntry = { pct: number; at: string }

function parseHistory(raw: unknown): ScoreEntry[] {
  if (!Array.isArray(raw)) return []
  const out: ScoreEntry[] = []
  for (const row of raw) {
    if (row && typeof row === "object" && "pct" in row) {
      const pct = Number((row as { pct: unknown }).pct)
      const at = typeof (row as { at?: unknown }).at === "string" ? (row as { at: string }).at : new Date().toISOString()
      if (Number.isFinite(pct)) out.push({ pct, at })
    }
  }
  return out
}

function applyLevelStep(current: LearningLevel, direction: 1 | -1 | 0): LearningLevel {
  const order: LearningLevel[] = ["beginner", "intermediate", "advanced"]
  const idx = order.indexOf(current)
  const next = Math.min(2, Math.max(0, idx + direction))
  return order[next]!
}

/**
 * Adaptive level from quiz percentage: >80% → step up, <50% → step down.
 */
export function levelDeltaFromPercent(pct: number): 1 | -1 | 0 {
  if (pct > 80) return 1
  if (pct < 50) return -1
  return 0
}

export async function appendAdaptiveScoreHistory(studentId: string, pct: number) {
  const child = await prisma.child.findUnique({
    where: { id: studentId },
    select: { adaptiveScoreHistory: true },
  })
  if (!child) return

  const history = parseHistory(child.adaptiveScoreHistory as unknown)
  history.push({ pct: Math.round(pct * 10) / 10, at: new Date().toISOString() })
  const trimmed = history.slice(-20)

  await prisma.child.update({
    where: { id: studentId },
    data: { adaptiveScoreHistory: trimmed as unknown as Prisma.InputJsonValue },
  })
}

export async function updateStudentLevelFromQuizPercent(studentId: string, pct: number) {
  const child = await prisma.child.findUnique({
    where: { id: studentId },
    select: { currentLevel: true },
  })
  if (!child) return

  const delta = levelDeltaFromPercent(pct)
  if (delta === 0) return

  const next = applyLevelStep(child.currentLevel, delta)
  if (next === child.currentLevel) return

  await prisma.child.update({
    where: { id: studentId },
    data: { currentLevel: next },
  })
}

const MAX_WEAK_AREAS = 25

export async function mergeWeakAreas(studentId: string, areas: string[]) {
  const cleaned = areas.map((a) => a.trim()).filter(Boolean)
  if (cleaned.length === 0) return

  const child = await prisma.child.findUnique({
    where: { id: studentId },
    select: { weakAreas: true },
  })
  if (!child) return

  const existing = new Set((child.weakAreas ?? []).map((w) => w.trim()).filter(Boolean))
  for (const a of cleaned) {
    existing.add(a)
  }
  const merged = [...existing].slice(0, MAX_WEAK_AREAS)

  await prisma.child.update({
    where: { id: studentId },
    data: { weakAreas: merged },
  })
}

export async function inferWeakAreaFromLesson(studentId: string, lessonId: string) {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    select: { title: true, unit: { select: { subject: { select: { name: true } } } } },
  })
  if (!lesson) return
  const label = `${lesson.unit.subject.name} — ${lesson.title}`
  await mergeWeakAreas(studentId, [label])
}

/**
 * Quiz: update level (80/50 rule), score history, lastQuizAt (via updateStudentLevelFromQuizPercent when level changes — lastQuizAt set there; also set when level unchanged?)
 * Worksheet: score history only (feeds prompts), no level change.
 */
export async function recordAdaptivePerformance(params: {
  studentId: string
  score: number
  maxScore: number
  source: "lesson_quiz" | "worksheet"
}) {
  const { studentId, score, maxScore, source } = params
  if (maxScore <= 0 || !Number.isFinite(score) || !Number.isFinite(maxScore)) return

  const pct = (score / maxScore) * 100
  await appendAdaptiveScoreHistory(studentId, pct)

  if (source === "lesson_quiz") {
    await updateStudentLevelFromQuizPercent(studentId, pct)
    await prisma.child.update({
      where: { id: studentId },
      data: { lastQuizAt: new Date() },
    })
  }
}
