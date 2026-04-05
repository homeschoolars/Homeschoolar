import "server-only"
import { prisma } from "@/lib/prisma"

const WORKSHEET_PASS_RATIO = 0.6

export async function lessonHasQuizPrompt(lessonId: string): Promise<boolean> {
  const n = await prisma.curriculumAIPrompt.count({
    where: { lessonId, type: "quiz" },
  })
  return n > 0
}

export async function assertLecturesComplete(studentId: string, lessonId: string) {
  const lectures = await prisma.curriculumLecture.findMany({
    where: { lessonId },
    select: { id: true },
  })
  if (lectures.length === 0) return

  const done = await prisma.studentLectureProgress.count({
    where: { studentId, lectureId: { in: lectures.map((l) => l.id) } },
  })
  if (done < lectures.length) {
    throw new Error("LecturesIncomplete")
  }
}

export async function countLessonWorksheetsDone(studentId: string, lessonId: string) {
  return prisma.studentLessonWorksheetDone.count({
    where: { studentId, lessonId },
  })
}

export async function getRequiredWorksheetCount(lessonId: string) {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    select: { requiredWorksheetCount: true },
  })
  return lesson?.requiredWorksheetCount ?? 0
}

export async function assertWorksheetsComplete(studentId: string, lessonId: string) {
  const required = await getRequiredWorksheetCount(lessonId)
  if (required <= 0) return
  const done = await countLessonWorksheetsDone(studentId, lessonId)
  if (done < required) {
    throw new Error("WorksheetsIncomplete")
  }
}

/** Call before accepting a lesson quiz submission (order: lectures → worksheets → quiz). */
export async function assertCanTakeLessonQuiz(studentId: string, lessonId: string) {
  await assertLecturesComplete(studentId, lessonId)
  await assertWorksheetsComplete(studentId, lessonId)
}

/** Full gate before marking lesson completed. */
export async function assertLessonCompletionGates(studentId: string, lessonId: string, progress: { quizPassed: boolean }) {
  await assertLecturesComplete(studentId, lessonId)
  await assertWorksheetsComplete(studentId, lessonId)

  const needsQuiz = await lessonHasQuizPrompt(lessonId)
  if (needsQuiz && !progress.quizPassed) {
    throw new Error("QuizRequired")
  }
}

export function worksheetScorePasses(score: number, maxScore: number) {
  if (maxScore <= 0) return false
  return score / maxScore >= WORKSHEET_PASS_RATIO
}

/**
 * Record a completed worksheet toward lesson gating (once per worksheet per student).
 * Returns true if a new row was created.
 */
export async function recordLessonWorksheetCompletion(params: {
  studentId: string
  lessonId: string
  worksheetId: string
  submissionId?: string | null
  score: number
  maxScore: number
}): Promise<boolean> {
  if (!worksheetScorePasses(params.score, params.maxScore)) {
    return false
  }

  try {
    await prisma.studentLessonWorksheetDone.create({
      data: {
        studentId: params.studentId,
        lessonId: params.lessonId,
        worksheetId: params.worksheetId,
        submissionId: params.submissionId ?? null,
        score: params.score,
        maxScore: params.maxScore,
      },
    })
    return true
  } catch {
    return false
  }
}
