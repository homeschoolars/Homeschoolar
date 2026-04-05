import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { completeLesson } from "@/services/progression"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { childId?: string; lessonId?: string }
    if (!body.childId || !body.lessonId) {
      return fail("childId and lessonId are required", 400)
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId: body.childId, session, request })

    const result = await completeLesson({
      studentId: body.childId,
      lessonId: body.lessonId,
    })
    return ok(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete lesson"
    if (message === "LecturesIncomplete") {
      return fail("LecturesIncomplete", 409)
    }
    if (message === "WorksheetsIncomplete") {
      return fail("WorksheetsIncomplete", 409)
    }
    if (message === "QuizRequired") {
      return fail("QuizRequired", 409)
    }
    if (message === "Lesson not found" || message === "NotFound") {
      return fail("Lesson not found", 404)
    }
    if (message === "Forbidden") {
      return fail("Forbidden", 403)
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
