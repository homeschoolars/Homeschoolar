import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { prisma } from "@/lib/prisma"
import { submitSubjectExam } from "@/services/parent-content-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentId?: string
      examId?: string
      answers?: {
        mcqs?: Array<{ index: number; answer: string }>
        shortQuestions?: Array<{ index: number; answer: string }>
      }
    }
    if (!body.studentId || !body.examId || !body.answers) {
      return fail("studentId, examId and answers are required", 400)
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId: body.studentId, session, request })

    const exam = await prisma.subjectExam.findUnique({
      where: { id: body.examId },
      select: { id: true, studentId: true },
    })
    if (!exam) {
      return fail("Exam not found", 404)
    }
    if (exam.studentId !== body.studentId) {
      return fail("Forbidden", 403)
    }

    const result = await submitSubjectExam({
      examId: body.examId,
      answers: body.answers,
    })

    return ok(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit exam"
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
