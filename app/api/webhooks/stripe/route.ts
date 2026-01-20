import { requireStripe } from "@/lib/stripe"
import type Stripe from "stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  let stripe
  try {
    stripe = requireStripe()
  } catch (error) {
    console.error("Stripe webhook received but Stripe is not configured:", error)
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")!

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error("Webhook signature verification failed")
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object
      const userId = session.metadata?.user_id
      const planId = session.metadata?.plan_id
      const billingPeriod = session.metadata?.billing_period

      if (userId && planId) {
        // Update subscription
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          plan: planId,
          status: "active",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          payment_provider: "stripe",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() + (billingPeriod === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
          ).toISOString(),
        })

        // Record payment
        await supabase.from("payments").insert({
          user_id: userId,
          provider: "stripe",
          provider_payment_id: session.payment_intent as string,
          amount: session.amount_total,
          currency: session.currency,
          status: "succeeded",
          description: `HomeSchoolar ${planId} subscription`,
        })

        // Create notification
        await supabase.from("notifications").insert({
          user_id: userId,
          title: "Subscription Activated!",
          message: `Your ${planId} plan is now active. Enjoy full access to HomeSchoolar!`,
          type: "success",
        })
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription & { current_period_end: number }
      const customerId = subscription.customer as string

      // Find user by customer ID
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single()

      if (sub) {
        await supabase
          .from("subscriptions")
          .update({
            status: subscription.status === "active" ? "active" : "past_due",
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_customer_id", customerId)
      }
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      await supabase.from("subscriptions").update({ status: "cancelled" }).eq("stripe_customer_id", customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
