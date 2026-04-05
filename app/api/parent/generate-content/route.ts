import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { generateParentControlledContent } from "@/services/parent-content-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentId?: string
      subjectId?: string
      unitId?: string
      contentType?: "quiz" | "worksheet" | "story"
      forceRegenerate?: boolean
    }

    if (!body.studentId || !body.subjectId || !body.unitId || !body.contentType) {
      return fail("studentId, subjectId, unitId and contentType are required", 400)
    }
    if (!["quiz", "worksheet", "story"].includes(body.contentType)) {
      return fail("contentType must be quiz, worksheet, or story", 400)
    }

    const session = await auth()
    await enforceParentChildAccess(body.studentId, session)

    const generated = await generateParentControlledContent({
      studentId: body.studentId,
      subjectId: body.subjectId,
      unitId: body.unitId,
      contentType: body.contentType,
      forceRegenerate: Boolean(body.forceRegenerate),
    })

    return ok({
      unitId: body.unitId,
      subjectId: body.subjectId,
      contentType: body.contentType,
      ...generated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate content"
    if (message === "UnitNotCompleted") {
      return fail("All lessons in this unit must be completed before generation", 409)
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
