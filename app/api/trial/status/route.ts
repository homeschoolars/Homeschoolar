import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { getTrialStatus } from "@/services/subscription-access"

// Force dynamic rendering - this route makes database calls via service
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await requireRole(["parent", "admin"])
    const status = await getTrialStatus(session.user.id)
    return NextResponse.json({ status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch trial status"
    const httpStatus = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status: httpStatus })
  }
}
