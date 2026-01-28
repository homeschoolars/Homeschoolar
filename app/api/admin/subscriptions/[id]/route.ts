import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { logAdminAction } from "@/services/admin-audit-service"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const updateSchema = z.object({
  status: z.enum(["pending", "active", "past_due", "cancelled", "expired"]).optional(),
  final_amount: z.number().int().positive().optional(),
  discount_percentage: z.number().int().min(0).max(100).optional(),
  discount_amount: z.number().int().min(0).optional(),
  coupon_code: z.string().optional().nullable(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole(["super_admin", "finance_admin"])
    const body = updateSchema.parse(await request.json())
    const { id } = await params
    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: body.status,
        finalAmount: body.final_amount,
        discountPercentage: body.discount_percentage,
        discountAmount: body.discount_amount,
        couponCode: body.coupon_code ?? undefined,
      },
    })

    await logAdminAction({
      adminId: session.user.id,
      action: "subscription.override",
      targetType: "subscription",
      targetId: id,
      metadata: body,
    })

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update subscription"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
