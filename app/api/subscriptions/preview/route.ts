import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { previewSubscription, serializePricing } from "@/services/subscription-service"
import { getParentChildCount } from "@/services/subscription-service"

// Force dynamic rendering - this route makes database calls via service
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const previewSchema = z.object({
  childCount: z.number().int().positive().optional(),
  planType: z.enum(["monthly", "yearly"]),
})

export async function POST(request: Request) {
  try {
    const session = await requireRole(["parent", "admin"])
    const body = previewSchema.parse(await request.json())
    const dbChildCount = await getParentChildCount(session.user.id)
    if (body.childCount && body.childCount !== dbChildCount) {
      return NextResponse.json({ error: "Child count mismatch" }, { status: 400 })
    }
    const pricing = await previewSubscription(session.user.id, body.planType)
    return NextResponse.json({ pricing: serializePricing(pricing) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to preview subscription"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
