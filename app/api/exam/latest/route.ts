import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { getLatestSubjectExam } from "@/services/parent-content-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const subjectId = searchParams.get("subjectId")
    if (!studentId || !subjectId) {
      return fail("studentId and subjectId are required", 400)
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId: studentId, session, request })

    const exam = await getLatestSubjectExam({ studentId, subjectId })
    return ok({ exam })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch exam"
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
