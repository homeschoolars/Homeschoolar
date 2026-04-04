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
      skipQuizRequirement: false,
    })
    return ok(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete lesson"
    if (message === "QuizRequired") {
      return fail("QuizRequired", 409)
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
