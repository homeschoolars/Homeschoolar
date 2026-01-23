import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { serializePricing, upsertSubscription } from "@/services/subscription-service"

const createSchema = z.object({
  planType: z.enum(["monthly", "yearly"]),
})

export async function POST(request: Request) {
  try {
    const session = await requireRole(["parent", "admin"])
    const body = createSchema.parse(await request.json())
    const result = await upsertSubscription({
      parentId: session.user.id,
      planType: body.planType,
      status: "pending",
    })
    return NextResponse.json({ subscription: result.subscription, pricing: serializePricing(result.pricing) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create subscription"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
