import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
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
