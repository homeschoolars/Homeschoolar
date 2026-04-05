import "server-only"
import { prisma } from "@/lib/prisma"

export type LessonProgressStatus = "locked" | "unlocked" | "completed"

function isPassScore(score: number, maxScore: number) {
  if (maxScore <= 0) return false
  return score / maxScore >= 0.6
}

async function getOrderedLessonsForUnit(unitId: string) {
  return prisma.curriculumLesson.findMany({
    where: { unitId },
    orderBy: [{ orderIndex: "asc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, orderIndex: true, displayOrder: true, unitId: true },
  })
}

export async function initializeStudentProgress(studentId: string, lessonId: string) {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, unitId: true },
  })
  if (!lesson) throw new Error("Lesson not found")

  const lessons = await getOrderedLessonsForUnit(lesson.unitId)
  if (lessons.length === 0) throw new Error("NotFound")
  const firstLessonId = lessons[0].id
  const lessonIds = lessons.map((l) => l.id)

  const existingRows = await prisma.studentLessonProgress.findMany({
    where: { studentId, lessonId: { in: lessonIds } },
    select: { lessonId: true, status: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
  })

  if (existingRows.length < lessons.length) {
    const existingIds = new Set(existingRows.map((row) => row.lessonId))
    const missingIds = lessonIds.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      await prisma.studentLessonProgress.createMany({
        data: missingIds.map((id) => ({
          studentId,
          lessonId: id,
          // If this is first-time initialization, unlock the first lesson only.
          status: existingRows.length === 0 && id === firstLessonId ? "unlocked" : "locked",
        })),
        skipDuplicates: true,
      })
    }
  }

  // Ensure exactly one unlocked lesson in the unit to prevent skip/parallel access.
  const progressRows = await prisma.studentLessonProgress.findMany({
    where: { studentId, lessonId: { in: lessonIds } },
    select: { lessonId: true, status: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
  })

  const unlockedRows = progressRows.filter((row) => row.status === "unlocked")

  if (unlockedRows.length === 0) {
    const firstLockedLesson = lessons.find((l) =>
      progressRows.some((row) => row.lessonId === l.id && row.status === "locked"),
    )
    if (!firstLockedLesson) {
      // All lessons are completed in this unit; nothing to unlock.
      return getStudentLessonState(studentId, lessonId)
    }
    await prisma.studentLessonProgress.update({
      where: { studentId_lessonId: { studentId, lessonId: firstLockedLesson.id } },
      data: { status: "unlocked", lastAccessedAt: new Date() },
    })
  } else if (unlockedRows.length > 1) {
    const sortedUnlocked = unlockedRows.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    const keepUnlocked = sortedUnlocked[0].lessonId
    const toLock = sortedUnlocked.filter((row) => row.lessonId !== keepUnlocked).map((row) => row.lessonId)
    if (toLock.length > 0) {
      await prisma.studentLessonProgress.updateMany({
        where: { studentId, lessonId: { in: toLock }, status: "unlocked" },
        data: { status: "locked" },
      })
    }
  }

  return getStudentLessonState(studentId, lessonId)
}

export async function getStudentLessonState(studentId: string, lessonId: string) {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, title: true, unitId: true, orderIndex: true, displayOrder: true },
  })
  if (!lesson) throw new Error("Lesson not found")

  const existingCount = await prisma.studentLessonProgress.count({
    where: { studentId, lesson: { unitId: lesson.unitId } },
  })
  if (existingCount === 0) {
    await initializeStudentProgress(studentId, lessonId)
  }

  const lessons = await getOrderedLessonsForUnit(lesson.unitId)
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
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, unitId: true },
  })
  if (!lesson) throw new Error("Lesson not found")

  const lessons = await getOrderedLessonsForUnit(lesson.unitId)
  const currentIndex = lessons.findIndex((l) => l.id === lessonId)
  if (currentIndex < 0) throw new Error("Lesson not found in unit")

  const nextLesson = lessons[currentIndex + 1]
  if (!nextLesson) return { unlocked: null }

  await prisma.$transaction(async (tx) => {
    await tx.studentLessonProgress.updateMany({
      where: { studentId, lessonId: { in: lessons.map((l) => l.id) }, status: "unlocked" },
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
  skipQuizRequirement,
}: {
  studentId: string
  lessonId: string
  skipQuizRequirement?: boolean
}) {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    select: { id: true, aiPrompts: { where: { type: "quiz" }, select: { id: true }, take: 1 } },
  })
  if (!lesson) throw new Error("Lesson not found")

  await initializeStudentProgress(studentId, lessonId)

  const current = await prisma.studentLessonProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
  })
  if (!current) throw new Error("NotFound")
  if (current.status === "locked") throw new Error("Forbidden")

  const requiresQuiz = lesson.aiPrompts.length > 0
  if (requiresQuiz && !skipQuizRequirement && !current.quizPassed) {
    throw new Error("QuizRequired")
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
  await completeLesson({ studentId, lessonId, skipQuizRequirement: true })

  const stateAfterCompletion = await getStudentLessonState(studentId, lessonId)
  const unlockedLesson = stateAfterCompletion.lessons.find((l) => l.status === "unlocked")

  return {
    passed: true,
    unlocked: unlockedLesson ? { id: unlockedLesson.lessonId, title: unlockedLesson.title } : null,
  }
}
