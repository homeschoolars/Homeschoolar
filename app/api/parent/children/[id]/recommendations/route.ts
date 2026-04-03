import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { getChildRecommendations } from "@/services/insights-service"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    await enforceParentChildAccess(id, session)
    const recommendations = await getChildRecommendations(id)
    return ok({ recommendations })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch recommendations"
    return fail(message, statusFromErrorMessage(message, 400))
  }
}
