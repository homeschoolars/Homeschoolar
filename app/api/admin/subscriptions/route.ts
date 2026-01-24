import { NextResponse } from "next/server"
import { requireAdminRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await requireAdminRole(["super_admin", "finance_admin"])
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true, name: true } } },
    })

    const tierSummary = subscriptions.reduce<
      Record<string, { count: number; revenue_usd: number; revenue_pkr: number }>
    >((acc, sub) => {
      const tier = String(sub.childCount)
      if (!acc[tier]) acc[tier] = { count: 0, revenue_usd: 0, revenue_pkr: 0 }
      acc[tier].count += 1
      if (sub.billingCurrency === "PKR") {
        acc[tier].revenue_pkr += sub.finalAmount ?? 0
      } else {
        acc[tier].revenue_usd += sub.finalAmount ?? 0
      }
      return acc
    }, {})

    return NextResponse.json({
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        user_id: sub.userId,
        user_email: sub.user?.email ?? null,
        user_name: sub.user?.name ?? null,
        child_count: sub.childCount,
        plan_type: sub.planType ?? sub.plan,
        status: sub.status,
        currency: sub.billingCurrency ?? sub.currency,
        final_amount: sub.finalAmount ?? null,
        created_at: sub.createdAt.toISOString(),
      })),
      tier_summary: tierSummary,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch subscriptions"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
