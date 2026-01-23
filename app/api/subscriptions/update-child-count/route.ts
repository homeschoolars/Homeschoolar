import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { serializePricing, updateSubscriptionChildCount } from "@/services/subscription-service"

export async function PUT() {
  try {
    const session = await requireRole(["parent", "admin"])
    const result = await updateSubscriptionChildCount(session.user.id)
    if (!result) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }
    return NextResponse.json({ subscription: result.subscription, pricing: serializePricing(result.pricing) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update subscription"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
