import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

const paymentSchema = z.object({
  planId: z.string(),
  billingPeriod: z.enum(["monthly", "yearly"]),
  amount: z.number(),
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

    await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount: body.amount,
        currency: "PKR",
        paymentMethod: body.paymentMethod,
        status: "pending",
        metadata: {
          plan_id: body.planId,
          billing_period: body.billingPeriod,
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
