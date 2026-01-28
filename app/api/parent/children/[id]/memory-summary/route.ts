import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { getMemorySummary } from "@/services/insights-service"

// Force dynamic rendering - this route makes database calls
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    await enforceParentChildAccess(id, session)
    const summary = await getMemorySummary(id)
    return NextResponse.json({ summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch memory summary"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
