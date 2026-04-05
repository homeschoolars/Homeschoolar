import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { submitLessonQuiz } from "@/services/progression"
import { inferWeakAreaFromLesson, mergeWeakAreas } from "@/services/adaptive-outcome"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      childId?: string
      lessonId?: string
      score?: number
      maxScore?: number
      weakAreaHints?: string[]
    }
    if (!body.childId || !body.lessonId) {
      return fail("childId and lessonId are required", 400)
    }
    if (!Number.isFinite(body.score) || !Number.isFinite(body.maxScore)) {
      return fail("score and maxScore are required", 400)
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId: body.childId, session, request })

    const result = await submitLessonQuiz({
      studentId: body.childId,
      lessonId: body.lessonId,
      score: Number(body.score),
      maxScore: Number(body.maxScore),
    })

    const maxScore = Number(body.maxScore)
    const score = Number(body.score)
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0
    if (Array.isArray(body.weakAreaHints) && body.weakAreaHints.length > 0) {
      await mergeWeakAreas(body.childId, body.weakAreaHints)
    } else if (pct < 50) {
      await inferWeakAreaFromLesson(body.childId, body.lessonId)
    }

    return ok(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit quiz"
    if (message === "Lesson not found" || message === "NotFound") {
      return fail("Lesson not found", 404)
    }
    if (message === "Forbidden") {
      return fail("Forbidden", 403)
    }
    if (message === "LecturesIncomplete") {
      return fail("LecturesIncomplete", 409)
    }
    if (message === "WorksheetsIncomplete") {
      return fail("WorksheetsIncomplete", 409)
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
