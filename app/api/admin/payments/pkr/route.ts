import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { z } from "zod"
import type { Payment, User } from "@prisma/client"

type PaymentWithUser = Payment & { user: User | null }

export async function GET() {
  try {
    await requireRole("admin")
    const payments = await prisma.payment.findMany({
      where: { currency: "PKR", status: "pending" },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    })
    const typedPayments = payments as PaymentWithUser[]

    return NextResponse.json({
      payments: typedPayments.map((payment) => ({
        id: payment.id,
        user_id: payment.userId,
        full_name: payment.user?.name ?? null,
        email: payment.user?.email ?? null,
        amount: payment.amount,
        currency: payment.currency,
        payment_method: payment.paymentMethod,
        metadata: payment.metadata,
        created_at: payment.createdAt.toISOString(),
        status: payment.status,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load payments"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole("admin")
    const body = z
      .object({
        paymentId: z.string(),
        status: z.enum(["succeeded", "failed"]),
        rejectionReason: z.string().optional(),
      })
      .parse(await request.json())

    await prisma.payment.update({
      where: { id: body.paymentId },
      data: {
        status: body.status,
        verifiedAt: new Date(),
        verifiedBy: session.user.id,
        rejectionReason: body.rejectionReason ?? null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update payment"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
