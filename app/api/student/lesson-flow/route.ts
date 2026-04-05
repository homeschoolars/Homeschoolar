import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { getLessonFlowState } from "@/services/lesson-flow"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("childId")
    const lessonId = searchParams.get("lessonId")
    if (!childId || !lessonId) {
      return fail("childId and lessonId are required", 400)
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId, session, request })

    const data = await getLessonFlowState(childId, lessonId)
    return ok(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load lesson flow"
    if (message === "Lesson not found") {
      return fail("Lesson not found", 404)
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
