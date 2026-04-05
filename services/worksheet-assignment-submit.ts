import "server-only"
import { prisma } from "@/lib/prisma"
import { recordLessonWorksheetCompletion } from "@/services/lesson-gate"
import { recordAdaptivePerformance } from "@/services/adaptive-outcome"

export type WorksheetSubmitAnswer = { question_id: string; answer: string }

export async function submitWorksheetAssignmentForStudent(params: {
  assignmentId: string
  childId: string
  answers: WorksheetSubmitAnswer[]
}) {
  const { assignmentId, childId, answers } = params

  const assignment = await prisma.worksheetAssignment.findUnique({
    where: { id: assignmentId },
    include: { worksheet: true },
  })

  if (!assignment || !assignment.worksheet) {
    throw new Error("Worksheet assignment not found")
  }

  if (assignment.childId !== childId) {
    throw new Error("Forbidden")
  }

  const questions = (assignment.worksheet.questions as Array<{ id: string; correct_answer: string; points: number }>) ?? []
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

  const submission = await prisma.worksheetSubmission.create({
    data: {
      assignmentId: assignment.id,
      childId: assignment.childId,
      answers,
      score,
      maxScore: totalPoints,
      aiFeedback: `You scored ${score}/${totalPoints}. Keep practicing to improve.`,
    },
  })

  await prisma.worksheetAssignment.update({
    where: { id: assignment.id },
    data: { status: "completed" },
  })

  const linkedLessonId = assignment.worksheet.lessonId
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
    score,
    maxScore: totalPoints,
    answers: scored,
    feedback: submission.aiFeedback,
  }
}
