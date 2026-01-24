import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { getChildRecommendations } from "@/services/insights-service"

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const session = await requireRole(["parent", "admin"])
    await enforceParentChildAccess(context.params.id, session)
    const recommendations = await getChildRecommendations(context.params.id)
    return NextResponse.json({ recommendations })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch recommendations"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
