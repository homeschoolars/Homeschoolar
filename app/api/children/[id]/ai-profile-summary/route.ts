import { NextResponse } from "next/server"
import { enforceParentChildAccess, requireRole } from "@/lib/auth-helpers"
import { getChildAiProfileSummary } from "@/services/onboarding-service"

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const session = await requireRole(["parent", "admin"])
    await enforceParentChildAccess(context.params.id, session)
    const summary = await getChildAiProfileSummary(context.params.id)
    return NextResponse.json({ summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch AI profile summary"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
