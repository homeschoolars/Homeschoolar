import "server-only"
import { prisma } from "@/lib/prisma"
import {
  assertCanTakeLessonQuiz,
  assertLessonCompletionGates,
  lessonHasQuizPrompt,
} from "@/services/lesson-gate"

export type LessonProgressStatus = "locked" | "unlocked" | "completed"

function isPassScore(score: number, maxScore: number) {
  if (maxScore <= 0) return false
  return score / maxScore >= 0.6
}

export async function getCurriculumSubjectIdForLesson(lessonId: string): Promise<string | null> {
  const row = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    select: { unit: { select: { subjectId: true } } },
  })
  return row?.unit.subjectId ?? null
}

/** All lessons in a curriculum subject in global order (units → lessons). */
export async function getOrderedLessonsForSubject(curriculumSubjectId: string) {
  const units = await prisma.curriculumUnit.findMany({
    where: { subjectId: curriculumSubjectId },
    orderBy: [{ orderIndex: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    include: {
      lessons: {
        orderBy: [{ orderIndex: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, orderIndex: true, displayOrder: true, unitId: true },
      },
    },
  })
  return units.flatMap((u) => u.lessons)
}

async function repairSingleUnlockedSubject(
  studentId: string,
  curriculumSubjectId: string,
  lessons: Array<{ id: string }>,
) {
  const lessonIds = lessons.map((l) => l.id)
  const progressRows = await prisma.studentLessonProgress.findMany({
    where: { studentId, lessonId: { in: lessonIds } },
    select: { lessonId: true, status: true, updatedAt: true },
  })
  const byLesson = new Map(progressRows.map((r) => [r.lessonId, r]))
  const unlockedRows = progressRows.filter((r) => r.status === "unlocked")

  if (unlockedRows.length === 0) {
    const firstNonCompleted = lessons.find((l) => {
      const p = byLesson.get(l.id)
      return !p || p.status !== "completed"
    })
    if (!firstNonCompleted) return
    await prisma.studentLessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId: firstNonCompleted.id } },
      update: { status: "unlocked", lastAccessedAt: new Date() },
      create: {
        studentId,
        lessonId: firstNonCompleted.id,
        status: "unlocked",
        lastAccessedAt: new Date(),
      },
    })
    return
  }

  if (unlockedRows.length === 1) return

  const sortedUnlocked = unlockedRows.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
  const keepId = sortedUnlocked[0]!.lessonId
  const toLock = unlockedRows.filter((r) => r.lessonId !== keepId).map((r) => r.lessonId)
  if (toLock.length > 0) {
    await prisma.studentLessonProgress.updateMany({
      where: { studentId, lessonId: { in: toLock }, status: "unlocked" },
      data: { status: "locked" },
    })
  }
}

export async function initializeStudentProgress(studentId: string, lessonId: string) {
  const subjectId = await getCurriculumSubjectIdForLesson(lessonId)
  if (!subjectId) throw new Error("Lesson not found")

  const lessons = await getOrderedLessonsForSubject(subjectId)
  if (lessons.length === 0) throw new Error("NotFound")

  const lessonIds = lessons.map((l) => l.id)
  const firstLessonId = lessonIds[0]!

  const existingRows = await prisma.studentLessonProgress.findMany({
    where: { studentId, lessonId: { in: lessonIds } },
    select: { lessonId: true },
  })
  const existingIds = new Set(existingRows.map((r) => r.lessonId))
  const missingIds = lessonIds.filter((id) => !existingIds.has(id))

  if (missingIds.length > 0) {
    const isFirstBatch = existingRows.length === 0
    await prisma.studentLessonProgress.createMany({
      data: missingIds.map((id) => ({
        studentId,
        lessonId: id,
        status: isFirstBatch && id === firstLessonId ? "unlocked" : "locked",
      })),
      skipDuplicates: true,
    })
  }

  await repairSingleUnlockedSubject(studentId, subjectId, lessons)

  return getStudentLessonState(studentId, lessonId)
}

/** Student must not fetch AI or full lesson content unless unlocked or completed. Parents may access for the same child. */
export async function assertStudentLessonContentAccess(studentId: string, lessonId: string) {
  await initializeStudentProgress(studentId, lessonId)
  const state = await getStudentLessonState(studentId, lessonId)
  if (!state.canAccess) {
    throw new Error("Forbidden")
  }
}

export async function getStudentLessonState(studentId: string, lessonId: string) {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, title: true, unitId: true, orderIndex: true, displayOrder: true },
  })
  if (!lesson) throw new Error("Lesson not found")

  const subjectId = await getCurriculumSubjectIdForLesson(lessonId)
  if (!subjectId) throw new Error("Lesson not found")

  const existingCount = await prisma.studentLessonProgress.count({
    where: { studentId, lesson: { unit: { subjectId } } },
  })
  if (existingCount === 0) {
    await initializeStudentProgress(studentId, lessonId)
  }

  const lessons = await getOrderedLessonsForSubject(subjectId)
  const progressRows = await prisma.studentLessonProgress.findMany({
    where: { studentId, lessonId: { in: lessons.map((l) => l.id) } },
    select: {
      lessonId: true,
      status: true,
      quizPassed: true,
      completedAt: true,
      lastAccessedAt: true,
    },
  })

  const progressMap = new Map(progressRows.map((row) => [row.lessonId, row]))
  const state = lessons.map((l) => ({
    lessonId: l.id,
    title: l.title,
    orderIndex: l.orderIndex,
    status: (progressMap.get(l.id)?.status ?? "locked") as LessonProgressStatus,
    completed: progressMap.get(l.id)?.status === "completed",
    quizPassed: progressMap.get(l.id)?.quizPassed ?? false,
    completedAt: progressMap.get(l.id)?.completedAt ?? null,
  }))

  const current = progressMap.get(lessonId)
  return {
    lessonId,
    status: (current?.status ?? "locked") as LessonProgressStatus,
    canAccess: current?.status === "unlocked" || current?.status === "completed",
    lessons: state,
  }
}

export async function unlockNextLesson(studentId: string, lessonId: string) {
  const subjectId = await getCurriculumSubjectIdForLesson(lessonId)
  if (!subjectId) throw new Error("Lesson not found")

  const lessons = await getOrderedLessonsForSubject(subjectId)
  const lessonIds = lessons.map((l) => l.id)
  const currentIndex = lessons.findIndex((l) => l.id === lessonId)
  if (currentIndex < 0) throw new Error("Lesson not found in subject")

  const nextLesson = lessons[currentIndex + 1]
  if (!nextLesson) return { unlocked: null }

  await prisma.$transaction(async (tx) => {
    await tx.studentLessonProgress.updateMany({
      where: { studentId, lessonId: { in: lessonIds }, status: "unlocked" },
      data: { status: "locked" },
    })

    await tx.studentLessonProgress.upsert({
      where: { studentId_lessonId: { studentId, lessonId: nextLesson.id } },
      update: {
        status: "unlocked",
        lastAccessedAt: new Date(),
      },
      create: {
        studentId,
        lessonId: nextLesson.id,
        status: "unlocked",
        lastAccessedAt: new Date(),
      },
    })
  })

  return { unlocked: { id: nextLesson.id, title: nextLesson.title } }
}

export async function completeLesson({
  studentId,
  lessonId,
  skipGateChecks,
}: {
  studentId: string
  lessonId: string
  skipGateChecks?: boolean
}) {
  await initializeStudentProgress(studentId, lessonId)

  const current = await prisma.studentLessonProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
  })
  if (!current) throw new Error("NotFound")
  if (current.status === "locked") throw new Error("Forbidden")

  if (!skipGateChecks) {
    await assertLessonCompletionGates(studentId, lessonId, { quizPassed: current.quizPassed })
  }

  const alreadyCompleted = current.status === "completed"
  await prisma.studentLessonProgress.update({
    where: { studentId_lessonId: { studentId, lessonId } },
    data: {
      status: "completed",
      completedAt: current.completedAt ?? new Date(),
      lastAccessedAt: new Date(),
    },
  })

  if (!alreadyCompleted) {
    await unlockNextLesson(studentId, lessonId)
  }

  return { completed: true }
}

export async function submitLessonQuiz({
  studentId,
  lessonId,
  score,
  maxScore,
}: {
  studentId: string
  lessonId: string
  score: number
  maxScore: number
}) {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore)) {
    throw new Error("Invalid quiz score")
  }

  await initializeStudentProgress(studentId, lessonId)
  const progress = await prisma.studentLessonProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
  })
  if (!progress) throw new Error("NotFound")
  if (progress.status === "locked") throw new Error("Forbidden")

  const hasQuiz = await lessonHasQuizPrompt(lessonId)
  await assertCanTakeLessonQuiz(studentId, lessonId)

  const passed = isPassScore(score, maxScore)
  if (!passed) {
    await prisma.studentLessonProgress.update({
      where: { studentId_lessonId: { studentId, lessonId } },
      data: { quizPassed: false, lastAccessedAt: new Date() },
    })
    return { passed: false, unlocked: null }
  }

  await prisma.studentLessonProgress.update({
    where: { studentId_lessonId: { studentId, lessonId } },
    data: { quizPassed: true, lastAccessedAt: new Date() },
  })

  const { recordAdaptivePerformance } = await import("@/services/adaptive-outcome")
  await recordAdaptivePerformance({
    studentId,
    score,
    maxScore,
    source: "lesson_quiz",
  })

  if (hasQuiz) {
    await completeLesson({ studentId, lessonId, skipGateChecks: true })
  } else {
    await assertLessonCompletionGates(studentId, lessonId, { quizPassed: true })
    await completeLesson({ studentId, lessonId, skipGateChecks: true })
  }

  const stateAfterCompletion = await getStudentLessonState(studentId, lessonId)
  const unlockedLesson = stateAfterCompletion.lessons.find((l) => l.status === "unlocked")

  return {
    passed: true,
    unlocked: unlockedLesson ? { id: unlockedLesson.lessonId, title: unlockedLesson.title } : null,
  }
}
