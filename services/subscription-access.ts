import { prisma } from "@/lib/prisma"
import { logAnalyticsEvent } from "@/services/analytics-service"

const DEFAULT_TRIAL_DAYS = 7

function getTrialDays() {
  const value = Number(process.env.TRIAL_DAYS ?? DEFAULT_TRIAL_DAYS)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TRIAL_DAYS
}

function getTrialAiLimit() {
  const value = Number(process.env.MAX_AI_CALLS_TRIAL ?? "25")
  return Number.isFinite(value) && value > 0 ? value : 25
}

export async function enforceSubscriptionAccess({
  userId,
  feature,
}: {
  userId: string
  feature: "ai" | "read"
}) {
  const subscription = await prisma.subscription.findFirst({ where: { userId } })
  if (!subscription) {
    throw new Error("Subscription required")
  }

  if (subscription.type === "orphan") {
    return subscription
  }

  if (subscription.type === "trial") {
    const trialEndsAt = subscription.trialEndsAt
    if (!trialEndsAt || trialEndsAt.getTime() < Date.now()) {
      throw new Error("Trial expired")
    }
    if (feature === "ai") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const usageCount = await prisma.analyticsEvent.count({
        where: { userId, eventType: { startsWith: "ai." }, createdAt: { gte: since } },
      })
      if (usageCount >= getTrialAiLimit()) {
        throw new Error("Trial AI limit reached")
      }
    }
    return subscription
  }

  if (subscription.status !== "active" && subscription.status !== "pending") {
    throw new Error("Subscription inactive")
  }

  return subscription
}

export async function startTrial(userId: string) {
  const parent = await prisma.parent.findUnique({ where: { userId } })
  if (!parent) {
    throw new Error("Parent profile required")
  }
  if (parent.trialUsedAt) {
    throw new Error("Trial already used")
  }
  const existing = await prisma.subscription.findFirst({ where: { userId } })
  if (existing && existing.type !== "trial") {
    throw new Error("Subscription already active")
  }

  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + getTrialDays() * 24 * 60 * 60 * 1000)
  const childCount = await prisma.child.count({ where: { parentId: userId } })
  if (childCount <= 0) {
    throw new Error("At least one child is required to start trial")
  }

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      type: "trial",
      plan: "trial",
      status: "active",
      isFree: true,
      trialEndsAt,
      startedAt: now,
      childCount,
    },
    create: {
      userId,
      plan: "trial",
      type: "trial",
      status: "active",
      isFree: true,
      trialEndsAt,
      startedAt: now,
      childCount,
      startDate: now,
    },
  })

  await prisma.parent.update({
    where: { id: parent.id },
    data: { trialUsedAt: now },
  })

  await logAnalyticsEvent({
    userId,
    eventType: "trial.started",
    eventData: { trialEndsAt: trialEndsAt.toISOString() },
  })

  return subscription
}

export async function getTrialStatus(userId: string) {
  const subscription = await prisma.subscription.findFirst({ where: { userId } })
  if (!subscription || subscription.type !== "trial") {
    return { status: "none" as const }
  }
  return {
    status: subscription.trialEndsAt && subscription.trialEndsAt.getTime() > Date.now() ? "active" : "expired",
    trial_ends_at: subscription.trialEndsAt?.toISOString() ?? null,
  }
}
