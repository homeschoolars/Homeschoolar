import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { getUnitCompletionForStudent } from "@/services/parent-content-service"

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
    await enforceParentChildAccess(studentId, session)

    const units = await getUnitCompletionForStudent({ studentId, subjectId })
    return ok({ units })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch unit completion"
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
