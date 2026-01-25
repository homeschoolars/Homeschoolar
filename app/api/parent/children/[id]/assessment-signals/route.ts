import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { generateAssessmentInsights } from "@/services/assessment-engine-service"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    await enforceParentChildAccess(id, session)
    const signals = await generateAssessmentInsights(id, session.user.id)
    return NextResponse.json({ signals })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate assessment signals"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
