import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

const bodySchema = z.object({
  userId: z.string(),
  planId: z.enum(["trial", "monthly", "yearly"]),
  periodEnd: z.string(),
})

export async function POST(request: Request) {
  try {
    await requireRole("admin")
    const body = bodySchema.parse(await request.json())

    const endDate = new Date(body.periodEnd)

    await prisma.subscription.upsert({
      where: { userId: body.userId },
      update: {
        plan: body.planId,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: endDate,
        paymentProvider: "pkr",
        currency: "pkr",
      },
      create: {
        userId: body.userId,
        plan: body.planId,
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: endDate,
        paymentProvider: "pkr",
        currency: "pkr",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update subscription"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
