import "server-only"
import { prisma } from "@/lib/prisma"
import { countLessonWorksheetsDone } from "@/services/lesson-gate"

export type LessonFlowAssignment = {
  id: string
  status: string
  worksheetId: string
  worksheetTitle: string
}

export async function getLessonFlowState(studentId: string, lessonId: string) {
  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      requiredWorksheetCount: true,
      lectures: {
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, orderIndex: true, contentJson: true },
      },
      aiPrompts: {
        where: { type: "quiz" },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!lesson) {
    throw new Error("Lesson not found")
  }

  const lectureIds = lesson.lectures.map((l) => l.id)
  const [completedRows, worksheetsCompleted, progress, assignments] = await Promise.all([
    lectureIds.length
      ? prisma.studentLectureProgress.findMany({
          where: { studentId, lectureId: { in: lectureIds } },
          select: { lectureId: true },
        })
      : Promise.resolve([] as { lectureId: string }[]),
    countLessonWorksheetsDone(studentId, lessonId),
    prisma.studentLessonProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } },
      select: { quizPassed: true, status: true },
    }),
    prisma.worksheetAssignment.findMany({
      where: {
        childId: studentId,
        worksheet: { lessonId },
      },
      orderBy: { createdAt: "asc" },
      include: {
        worksheet: { select: { id: true, title: true, lessonId: true } },
      },
    }),
  ])

  const completedSet = new Set(completedRows.map((r) => r.lectureId))

  const lectures = lesson.lectures.map((l) => ({
    id: l.id,
    title: l.title,
    orderIndex: l.orderIndex,
    completed: completedSet.has(l.id),
  }))

  const flowAssignments: LessonFlowAssignment[] = assignments.map((a) => ({
    id: a.id,
    status: a.status,
    worksheetId: a.worksheet.id,
    worksheetTitle: a.worksheet.title,
  }))

  return {
    lessonId: lesson.id,
    lessonTitle: lesson.title,
    lectures,
    lecturesComplete: lectureIds.length === 0 || completedSet.size >= lectureIds.length,
    requiredWorksheetCount: lesson.requiredWorksheetCount,
    worksheetsCompleted,
    worksheetsComplete:
      lesson.requiredWorksheetCount <= 0 || worksheetsCompleted >= lesson.requiredWorksheetCount,
    quizPassed: progress?.quizPassed ?? false,
    hasQuizPrompt: lesson.aiPrompts.length > 0,
    lessonProgressStatus: progress?.status ?? "locked",
    assignments: flowAssignments,
  }
}
