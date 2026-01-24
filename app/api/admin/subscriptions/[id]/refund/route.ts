import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdminRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { logAdminAction } from "@/services/admin-audit-service"

const refundSchema = z.object({
  reason: z.string().optional(),
})

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const session = await requireAdminRole(["super_admin", "finance_admin"])
    const body = refundSchema.parse(await request.json())
    const subscription = await prisma.subscription.findUnique({ where: { id: context.params.id } })
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }

    await prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amount: subscription.finalAmount ?? 0,
        currency: subscription.billingCurrency ?? subscription.currency ?? "USD",
        status: "refunded",
        paymentProvider: "manual",
        description: "Admin refund",
        metadata: {
          reason: body.reason ?? null,
        },
      },
    })

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "cancelled" },
    })

    await logAdminAction({
      adminId: session.user.id,
      action: "subscription.refund",
      targetType: "subscription",
      targetId: subscription.id,
      metadata: { reason: body.reason ?? null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to refund subscription"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
