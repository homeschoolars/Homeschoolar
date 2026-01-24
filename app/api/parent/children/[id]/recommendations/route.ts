import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { getChildRecommendations } from "@/services/insights-service"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    await enforceParentChildAccess(id, session)
    const recommendations = await getChildRecommendations(id)
    return NextResponse.json({ recommendations })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch recommendations"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
