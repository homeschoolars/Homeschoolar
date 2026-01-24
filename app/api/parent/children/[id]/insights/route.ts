import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { getChildInsights } from "@/services/insights-service"

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const session = await requireRole(["parent", "admin"])
    await enforceParentChildAccess(context.params.id, session)
    const insights = await getChildInsights(context.params.id)
    return NextResponse.json({ insights })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch insights"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
