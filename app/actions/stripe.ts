"use server"

import { requireStripe } from "@/lib/stripe"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { buildPricing } from "@/services/pricing.service"
import { getParentChildCount } from "@/services/subscription-service"

export async function startCheckoutSession(planType: "monthly" | "yearly") {
  const stripe = requireStripe()

  const authSession = await auth()
  const user = authSession?.user
  if (!user || (user.role !== "parent" && user.role !== "admin")) {
    throw new Error("Not authorized")
  }

  const childCount = await getParentChildCount(user.id)
  const pricing = buildPricing({ childCount, planType, currency: "USD" })

  const checkoutSession = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    customer_email: user?.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `HomeSchoolar ${planType === "yearly" ? "Yearly" : "Monthly"} Plan`,
            description: `${childCount} ${childCount === 1 ? "child" : "children"} on plan`,
          },
          unit_amount: pricing.finalAmount,
          recurring: {
            interval: planType === "yearly" ? "year" : "month",
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: {
      user_id: user?.id || "",
      plan_type: planType,
      child_count: String(childCount),
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
