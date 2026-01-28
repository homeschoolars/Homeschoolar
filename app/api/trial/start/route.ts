import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { startTrial } from "@/services/subscription-access"
import { serializeSubscription } from "@/lib/serializers"

// Force dynamic rendering - this route makes database calls via service
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  try {
    const session = await requireRole(["parent", "admin"])
    const subscription = await startTrial(session.user.id)
    return NextResponse.json({ subscription: serializeSubscription(subscription) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start trial"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
