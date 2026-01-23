import { prisma } from "@/lib/prisma"
import type { BillingCurrency, SubscriptionPlanType } from "@/lib/types"
import { buildPricing } from "@/services/pricing.service"
import { logAnalyticsEvent } from "@/services/analytics-service"

function resolveCurrency(country?: string | null): BillingCurrency {
  if (!country) return "USD"
  return country.toLowerCase() === "pakistan" ? "PKR" : "USD"
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function addYears(date: Date, years: number) {
  const next = new Date(date)
  next.setFullYear(next.getFullYear() + years)
  return next
}

export async function getParentChildCount(parentId: string) {
  return prisma.child.count({ where: { parentId } })
}

export async function getParentCurrency(parentId: string) {
  const parent = await prisma.parent.findUnique({ where: { userId: parentId }, select: { country: true } })
  return resolveCurrency(parent?.country)
}

export async function previewSubscription(parentId: string, planType: SubscriptionPlanType) {
  const childCount = await getParentChildCount(parentId)
  if (childCount <= 0) {
    throw new Error("At least one child is required to preview pricing")
  }
  const currency = await getParentCurrency(parentId)
  return buildPricing({ childCount, planType, currency })
}

export function serializePricing(pricing: ReturnType<typeof buildPricing>) {
  return {
    child_count: pricing.childCount,
    currency: pricing.currency,
    monthly_price: pricing.monthlyPrice,
    yearly_price: pricing.yearlyPrice,
    base_monthly_price: pricing.baseMonthlyPrice,
    base_yearly_price: pricing.baseYearlyPrice,
    discount_percentage: pricing.discountPercentage,
    discount_amount: pricing.discountAmount,
    savings_amount: pricing.savingsAmount,
    per_child_monthly: pricing.perChildMonthly,
    per_child_yearly: pricing.perChildYearly,
  }
}

export async function upsertSubscription({
  parentId,
  planType,
  status = "pending",
}: {
  parentId: string
  planType: SubscriptionPlanType
  status?: "pending" | "active" | "past_due" | "cancelled" | "expired"
}) {
  const childCount = await getParentChildCount(parentId)
  if (childCount <= 0) {
    throw new Error("At least one child is required to subscribe")
  }
  const currency = await getParentCurrency(parentId)
  const pricing = buildPricing({ childCount, planType, currency })
  const now = new Date()
  const expiresAt = planType === "yearly" ? addYears(now, 1) : addMonths(now, 1)

  const subscription = await prisma.subscription.upsert({
    where: { userId: parentId },
    update: {
      plan: planType,
      planType,
      childCount,
      baseMonthlyPrice: pricing.baseMonthlyPrice,
      discountPercentage: pricing.discountPercentage,
      discountAmount: pricing.discountAmount,
      finalAmount: pricing.finalAmount,
      billingCurrency: currency,
      amount: pricing.finalAmount,
      currency: currency,
      status,
      startedAt: now,
      expiresAt,
    },
    create: {
      userId: parentId,
      plan: planType,
      planType,
      childCount,
      baseMonthlyPrice: pricing.baseMonthlyPrice,
      discountPercentage: pricing.discountPercentage,
      discountAmount: pricing.discountAmount,
      finalAmount: pricing.finalAmount,
      billingCurrency: currency,
      amount: pricing.finalAmount,
      currency: currency,
      status,
      startedAt: now,
      expiresAt,
      startDate: now,
    },
  })

  await logAnalyticsEvent({
    userId: parentId,
    eventType: "subscription.upserted",
    eventData: {
      planType,
      childCount,
      currency,
      amount: pricing.finalAmount,
    },
  })

  return { subscription, pricing }
}

export async function updateSubscriptionChildCount(parentId: string) {
  const subscription = await prisma.subscription.findFirst({ where: { userId: parentId } })
  if (!subscription) {
    return null
  }
  const planType =
    subscription.planType ?? (subscription.plan === "yearly" || subscription.plan === "monthly" ? subscription.plan : "monthly")
  const childCount = await getParentChildCount(parentId)
  if (childCount <= 0) {
    throw new Error("At least one child is required")
  }
  const currency = await getParentCurrency(parentId)
  const pricing = buildPricing({ childCount, planType, currency })

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      childCount,
      baseMonthlyPrice: pricing.baseMonthlyPrice,
      discountPercentage: pricing.discountPercentage,
      discountAmount: pricing.discountAmount,
      finalAmount: pricing.finalAmount,
      billingCurrency: currency,
      amount: pricing.finalAmount,
      currency: currency,
    },
  })

  await logAnalyticsEvent({
    userId: parentId,
    eventType: "subscription.child_count_updated",
    eventData: { childCount },
  })

  return { subscription: updated, pricing }
}

export async function changeSubscriptionPlan(parentId: string, planType: SubscriptionPlanType) {
  const subscription = await prisma.subscription.findFirst({ where: { userId: parentId } })
  if (!subscription) {
    throw new Error("Subscription not found")
  }
  const currency = await getParentCurrency(parentId)
  const childCount = await getParentChildCount(parentId)
  const pricing = buildPricing({ childCount, planType, currency })
  const now = new Date()
  const expiresAt = planType === "yearly" ? addYears(now, 1) : addMonths(now, 1)

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      plan: planType,
      planType,
      childCount,
      baseMonthlyPrice: pricing.baseMonthlyPrice,
      discountPercentage: pricing.discountPercentage,
      discountAmount: pricing.discountAmount,
      finalAmount: pricing.finalAmount,
      billingCurrency: currency,
      amount: pricing.finalAmount,
      currency: currency,
      status: "pending",
      startedAt: now,
      expiresAt,
    },
  })

  await logAnalyticsEvent({
    userId: parentId,
    eventType: "subscription.plan_changed",
    eventData: { planType, childCount },
  })

  return { subscription: updated, pricing }
}
