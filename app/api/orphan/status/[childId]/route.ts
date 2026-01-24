import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { getOrphanStatus } from "@/services/orphan-verification-service"

export async function GET(_request: Request, { params }: { params: Promise<{ childId: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { childId } = await params
    const status = await getOrphanStatus(childId, session.user.id, session.user.role === "admin")
    return NextResponse.json({ status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch orphan status"
    const code = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status: code })
  }
}
