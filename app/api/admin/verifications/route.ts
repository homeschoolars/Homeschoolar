import { NextResponse } from "next/server"
import { z } from "zod"
import { Resend } from "resend"
import { requireAdminRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { logAdminAction } from "@/services/admin-audit-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function notifyGuardian(email: string | null, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY
  if (!key || !email) return
  const resend = new Resend(key)
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"
  await resend.emails.send({ from, to: email, subject, text })
}

export async function GET() {
  try {
    await requireAdminRole(["super_admin", "support_admin"])
    const rows = await prisma.user.findMany({
      where: { guardianVerificationStatus: "pending" },
      select: {
        id: true,
        name: true,
        email: true,
        onboardingCountry: true,
        deathCertificateUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json({
      users: rows.map((u) => ({
        id: u.id,
        name: u.name ?? "—",
        email: u.email,
        country: u.onboardingCountry ?? "—",
        certificateUrl: u.deathCertificateUrl,
        createdAt: u.createdAt.toISOString(),
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unauthorized"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

const patchSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
})

export async function PATCH(request: Request) {
  try {
    const adminSession = await requireAdminRole(["super_admin", "support_admin"])
    const body = patchSchema.parse(await request.json())
    const userId = body.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, guardianVerificationStatus: true, name: true },
    })
    if (!user || user.guardianVerificationStatus !== "pending") {
      return NextResponse.json({ error: "User not pending verification" }, { status: 400 })
    }

    if (body.action === "approve") {
      const existingSubscription = await prisma.subscription.findUnique({ where: { userId } })
      if (existingSubscription?.type === "paid") {
        return NextResponse.json(
          { error: "Paid subscription must be canceled before guardian approval" },
          { status: 400 },
        )
      }

      const childCount = await prisma.child.count({ where: { parentId: userId } })
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            guardianVerificationStatus: "verified",
            eligibleForFreeEducation: true,
          },
        })
        await tx.child.updateMany({
          where: { parentId: userId },
          data: { isOrphan: true, orphanStatus: "verified" },
        })
        await tx.subscription.upsert({
          where: { userId },
          update: {
            type: "orphan",
            plan: "trial",
            planType: null,
            status: "active",
            isFree: true,
            trialEndsAt: null,
            finalAmount: 0,
            discountPercentage: 0,
            discountAmount: 0,
            baseMonthlyPrice: 0,
            childCount,
          },
          create: {
            userId,
            plan: "trial",
            type: "orphan",
            status: "active",
            isFree: true,
            finalAmount: 0,
            discountPercentage: 0,
            discountAmount: 0,
            baseMonthlyPrice: 0,
            childCount,
            startedAt: new Date(),
            startDate: new Date(),
          },
        })
      })

      await notifyGuardian(
        user.email,
        "Your guardian verification was approved",
        `Hi ${user.name ?? ""},\n\nYour free education plan is now active on HomeSchoolar.\n\nThank you.`,
      ).catch(() => {})

      await logAdminAction({
        adminId: adminSession.user.id,
        action: "guardian_verification.approve",
        targetType: "user",
        targetId: userId,
        metadata: {},
      })

      return NextResponse.json({ success: true })
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        guardianVerificationStatus: "rejected",
        eligibleForFreeEducation: false,
      },
    })

    await notifyGuardian(
      user.email,
      "Update on your guardian verification",
      `Hi ${user.name ?? ""},\n\nWe could not verify your document. Please sign in and upload a clearer death certificate (PDF, JPG, or PNG under 10MB) from your dashboard.\n\nIf you need help, contact support.`,
    ).catch(() => {})

    await logAdminAction({
      adminId: adminSession.user.id,
      action: "guardian_verification.reject",
      targetType: "user",
      targetId: userId,
      metadata: {},
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    const msg = e instanceof Error ? e.message : "Unauthorized"
    const status = msg === "Unauthorized" || msg === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
