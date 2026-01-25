import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { generateCurriculumFromAssessment } from "@/services/ai-service"

/** POST regenerate curriculum from assessment. Parent can request a new plan. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    await enforceParentChildAccess(id, session)

    const result = await generateCurriculumFromAssessment(id, session.user.id)
    return NextResponse.json({ paths: result.paths, summary: result.summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate curriculum"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
