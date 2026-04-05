import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { getStudentLessonState, initializeStudentProgress } from "@/services/progression"

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

    await initializeStudentProgress(childId, lessonId)
    const state = await getStudentLessonState(childId, lessonId)

    return ok(state)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load lesson progress"
    if (message === "Lesson not found" || message === "NotFound") {
      return fail("Lesson not found", 404)
    }
    if (message === "Forbidden") {
      return fail("Forbidden", 403)
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
