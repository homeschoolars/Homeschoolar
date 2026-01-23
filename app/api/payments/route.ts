import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { createPayment } from "@/services/payments.service"
import { PaymentGateway } from "@prisma/client"

const bodySchema = z.object({
  amount: z.number().int().positive(),
  currency: z.enum(["USD", "EUR", "PKR"]),
  gateway: z.enum(["payoneer", "jazzcash", "easypaisa"]).optional(),
  returnUrl: z.string().url(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireRole(["parent", "admin"])
    const body = bodySchema.parse(await request.json())

    const result = await createPayment({
      userId: session.user.id,
      amount: body.amount,
      currency: body.currency,
      gateway: body.gateway ? (body.gateway as PaymentGateway) : undefined,
      returnUrl: body.returnUrl,
      webhookBaseUrl: process.env.NEXT_PUBLIC_APP_URL || "",
      customerEmail: body.customerEmail ?? session.user.email ?? null,
      customerPhone: body.customerPhone ?? null,
      metadata: body.metadata ?? {},
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create payment"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
