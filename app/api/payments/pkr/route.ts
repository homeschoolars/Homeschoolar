import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { buildPricing } from "@/services/pricing.service"
import { getParentChildCount } from "@/services/subscription-service"
import { upsertSubscription } from "@/services/subscription-service"

const paymentSchema = z.object({
  planType: z.enum(["monthly", "yearly"]),
  billingPeriod: z.enum(["monthly", "yearly"]),
  paymentMethod: z.string(),
  transactionId: z.string().optional(),
  senderNumber: z.string().optional(),
  notes: z.string().optional(),
  receiptName: z.string().optional(),
  receiptBase64: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireRole(["parent", "admin"])
    const body = paymentSchema.parse(await request.json())
    if (body.planType !== body.billingPeriod) {
      return NextResponse.json({ error: "Plan type mismatch" }, { status: 400 })
    }

    const childCount = await getParentChildCount(session.user.id)
    const pricing = buildPricing({ childCount, planType: body.planType, currency: "PKR" })
    const subscriptionResult = await upsertSubscription({
      parentId: session.user.id,
      planType: body.planType,
      status: "pending",
    })

    const paymentProvider =
      body.paymentMethod === "easypaisa" ? "easypaisa" : body.paymentMethod === "jazzcash" ? "jazzcash" : "manual"

    await prisma.payment.create({
      data: {
        userId: session.user.id,
        subscriptionId: subscriptionResult.subscription.id,
        amount: pricing.finalAmount,
        currency: "PKR",
        paymentProvider,
        paymentMethod: body.paymentMethod,
        status: "pending",
        transactionReference: body.transactionId,
        metadata: {
          plan_type: body.planType,
          billing_period: body.billingPeriod,
          child_count: childCount,
          pricing,
          transaction_id: body.transactionId,
          sender_number: body.senderNumber,
          notes: body.notes,
          receipt_name: body.receiptName,
          receipt_base64: body.receiptBase64,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit payment"
    const status = message === "Unauthorized" ? 401 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
