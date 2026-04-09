import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { assignOnboardingPlan } from "@/services/onboarding-flow-service"
import { prisma } from "@/lib/prisma"

const bodySchema = z.object({
  userId: z.string().min(1),
  planType: z.enum(["free", "trial"]),
  trialStart: z.string().datetime().optional(),
  trialEnd: z.string().datetime().optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = bodySchema.parse(await request.json())
    if (body.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await assignOnboardingPlan({
      userId: body.userId,
      planType: body.planType,
      trialStart: body.trialStart ? new Date(body.trialStart) : undefined,
      trialEnd: body.trialEnd ? new Date(body.trialEnd) : undefined,
    })

    const fresh = await prisma.user.findUnique({
      where: { id: body.userId },
      select: {
        onboardingComplete: true,
        guardianVerificationStatus: true,
        eligibleForFreeEducation: true,
      },
    })

    return NextResponse.json({
      success: true,
      user: fresh,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong"
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
