import "server-only"
import { prisma } from "@/lib/prisma"
import { recordLessonWorksheetCompletion } from "@/services/lesson-gate"
import { recordAdaptivePerformance } from "@/services/adaptive-outcome"
import { generateWorksheetAiFeedback } from "@/services/ai-worksheet-evaluation"
import { createStudentWorksheetRecord, recordTopicAttemptPercent } from "@/services/student-topic-analytics"

export type WorksheetSubmitAnswer = { question_id: string; answer: string }

type QuestionRow = { id: string; question?: string; correct_answer: string; points: number }

export async function submitWorksheetAssignmentForStudent(params: {
  assignmentId: string
  childId: string
  answers: WorksheetSubmitAnswer[]
}) {
  const { assignmentId, childId, answers } = params

  const assignment = await prisma.worksheetAssignment.findUnique({
    where: { id: assignmentId },
    include: { worksheet: true, child: { select: { name: true } } },
  })

  if (!assignment || !assignment.worksheet) {
    throw new Error("Worksheet assignment not found")
  }

  if (assignment.childId !== childId) {
    throw new Error("Forbidden")
  }

  if (assignment.status === "completed") {
    throw new Error("AlreadySubmitted")
  }

  const questions = (assignment.worksheet.questions as QuestionRow[]) ?? []
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)
  const scored = answers.map((a) => {
    const q = questions.find((x) => x.id === a.question_id)
    const isCorrect = q ? String(q.correct_answer).trim().toLowerCase() === String(a.answer).trim().toLowerCase() : false
    return {
      ...a,
      is_correct: isCorrect,
      points: isCorrect ? q?.points ?? 0 : 0,
    }
  })
  const score = scored.reduce((sum, s) => sum + s.points, 0)
  const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0

  const ai = await generateWorksheetAiFeedback({
    studentName: assignment.child.name ?? undefined,
    rows: scored.map((s) => {
      const q = questions.find((x) => x.id === s.question_id)
      return {
        question_id: s.question_id,
        question: q?.question ?? `Question ${s.question_id}`,
        correct_answer: String(q?.correct_answer ?? ""),
        student_answer: s.answer,
        is_correct: s.is_correct,
      }
    }),
    score,
    maxScore: totalPoints,
    percentage,
  })

  const submission = await prisma.worksheetSubmission.create({
    data: {
      assignmentId: assignment.id,
      childId: assignment.childId,
      answers,
      score,
      maxScore: totalPoints,
      aiFeedback: ai.feedback,
    },
  })

  await prisma.worksheetAssignment.update({
    where: { id: assignment.id },
    data: { status: "completed" },
  })

  const linkedLessonId = assignment.worksheet.lessonId

  await createStudentWorksheetRecord({
    studentId: childId,
    worksheetId: assignment.worksheet.id,
    assignmentId: assignment.id,
    subjectId: assignment.worksheet.subjectId,
    topicId: linkedLessonId,
    answersJson: answers,
    score,
    maxScore: totalPoints,
    percentage,
    feedback: ai.feedback,
    weakTopics: ai.weak_topics,
  })

  await recordTopicAttemptPercent({
    studentId: childId,
    topicId: linkedLessonId,
    percentage,
  })

  if (linkedLessonId) {
    await recordLessonWorksheetCompletion({
      studentId: assignment.childId,
      lessonId: linkedLessonId,
      worksheetId: assignment.worksheet.id,
      submissionId: submission.id,
      score,
      maxScore: totalPoints,
    })
    await recordAdaptivePerformance({
      studentId: assignment.childId,
      score,
      maxScore: totalPoints,
      source: "worksheet",
    })
  }

  return {
    submissionId: submission.id,
    score: `${score}/${totalPoints}`,
    scoreNumeric: score,
    maxScore: totalPoints,
    percentage,
    feedback: ai.feedback,
    weak_topics: ai.weak_topics,
    answers: scored,
  }
}

/**
 * Resolve latest pending assignment for worksheet + student (for POST /api/submit-worksheet body shape).
 */
export async function findPendingAssignmentForWorksheet(worksheetId: string, childId: string) {
  return prisma.worksheetAssignment.findFirst({
    where: { worksheetId, childId, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
}
