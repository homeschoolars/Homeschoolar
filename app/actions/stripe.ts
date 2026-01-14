"use server"

import { stripe } from "@/lib/stripe"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"
import { createClient } from "@/lib/supabase/server"

export async function startCheckoutSession(planId: string, billingPeriod: "monthly" | "yearly") {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
  if (!plan) {
    throw new Error(`Plan "${planId}" not found`)
  }

  const price = billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly
  if (price === 0) {
    throw new Error("Cannot checkout for free plan")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    redirect_on_completion: "never",
    customer_email: user?.email,
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

  return session.client_secret
}

export async function createPortalSession() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single()

  if (!subscription?.stripe_customer_id) {
    throw new Error("No Stripe customer found")
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/parent`,
  })

  return session.url
}
