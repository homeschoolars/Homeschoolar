import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { changeSubscriptionPlan, serializePricing } from "@/services/subscription-service"

const changeSchema = z.object({
  planType: z.enum(["monthly", "yearly"]),
})

export async function PUT(request: Request) {
  try {
    const session = await requireRole(["parent", "admin"])
    const body = changeSchema.parse(await request.json())
    const result = await changeSubscriptionPlan(session.user.id, body.planType)
    return NextResponse.json({ subscription: result.subscription, pricing: serializePricing(result.pricing) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to change subscription plan"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
