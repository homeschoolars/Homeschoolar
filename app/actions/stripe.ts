"use server"

import { requireStripe } from "@/lib/stripe"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function startCheckoutSession(planId: string, billingPeriod: "monthly" | "yearly") {
  const stripe = requireStripe()
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
  if (!plan) {
    throw new Error(`Plan "${planId}" not found`)
  }

  const price = billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly
  if (price === 0) {
    throw new Error("Cannot checkout for free plan")
  }

  const authSession = await auth()
  const user = authSession?.user
  if (!user || (user.role !== "parent" && user.role !== "admin")) {
    throw new Error("Not authorized")
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    customer_email: user?.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `HomeSchoolar ${plan.name}`,
            description: plan.description,
          },
          unit_amount: price,
          recurring: {
            interval: billingPeriod === "yearly" ? "year" : "month",
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: {
      user_id: user?.id || "",
      plan_id: planId,
      billing_period: billingPeriod,
    },
  })

  return checkoutSession.client_secret
}

export async function createPortalSession() {
  const stripe = requireStripe()
  const authSession = await auth()
  const user = authSession?.user

  if (!user || (user.role !== "parent" && user.role !== "admin")) {
    throw new Error("Not authenticated")
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  })

  if (!subscription?.stripeCustomerId) {
    throw new Error("No Stripe customer found")
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/parent`,
  })

  return portalSession.url
}
