import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { createAssessment } from "@/services/assessment-service"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z.object({
  childId: z.string().min(1),
  subjectId: z.string().min(1),
  difficultyLevel: z.enum(["easy", "medium", "hard"]).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireRole(["parent", "admin"])
    const body = bodySchema.parse(await request.json())
    await enforceParentChildAccess(body.childId, session)

    const assessment = await createAssessment({
      childId: body.childId,
      subjectId: body.subjectId,
      assessmentType: "baseline",
      difficultyLevel: body.difficultyLevel ?? null,
      userId: session.user.id,
    })

    return NextResponse.json({ assessmentId: assessment.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create assessment"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
