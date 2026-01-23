import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

const updateSchema = z.object({
  status: z.enum(["pending", "active", "past_due", "cancelled", "expired"]).optional(),
  final_amount: z.number().int().positive().optional(),
  discount_percentage: z.number().int().min(0).max(100).optional(),
  discount_amount: z.number().int().min(0).optional(),
  coupon_code: z.string().optional().nullable(),
})

export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    await requireRole("admin")
    const body = updateSchema.parse(await request.json())
    const updated = await prisma.subscription.update({
      where: { id: context.params.id },
      data: {
        status: body.status,
        finalAmount: body.final_amount,
        discountPercentage: body.discount_percentage,
        discountAmount: body.discount_amount,
        couponCode: body.coupon_code ?? undefined,
      },
    })

    return NextResponse.json({ subscription: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update subscription"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
