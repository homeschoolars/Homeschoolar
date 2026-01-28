import { NextResponse } from "next/server"
import { enforceParentChildAccess, requireRole } from "@/lib/auth-helpers"
import { getChildAiProfileSummary } from "@/services/onboarding-service"

// Force dynamic rendering - this route makes database calls
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    await enforceParentChildAccess(id, session)
    const summary = await getChildAiProfileSummary(id)
    return NextResponse.json({ summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch AI profile summary"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
