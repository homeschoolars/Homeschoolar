import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { generateSubjectExam } from "@/services/parent-content-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentId?: string
      subjectId?: string
      forceRegenerate?: boolean
    }
    if (!body.studentId || !body.subjectId) {
      return fail("studentId and subjectId are required", 400)
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId: body.studentId, session, request })

    const generated = await generateSubjectExam({
      studentId: body.studentId,
      subjectId: body.subjectId,
      forceRegenerate: Boolean(body.forceRegenerate),
    })

    return ok({
      cached: generated.cached,
      exam: {
        id: generated.exam.id,
        studentId: generated.exam.studentId,
        subjectId: generated.exam.subjectId,
        examJson: generated.exam.examJson,
        score: generated.exam.score,
        completedAt: generated.exam.completedAt,
        createdAt: generated.exam.createdAt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate exam"
    if (message === "SubjectNotCompleted") {
      return fail("Subject completion required before final exam", 409)
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
