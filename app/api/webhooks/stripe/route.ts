import { requireStripe } from "@/lib/stripe"
import type Stripe from "stripe"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  let stripe
  try {
    stripe = requireStripe()
  } catch (error) {
    console.error("Stripe webhook received but Stripe is not configured:", error)
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 })
  }

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
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const planId = session.metadata?.plan_id as "trial" | "monthly" | "yearly" | undefined
      const billingPeriod = session.metadata?.billing_period

      if (userId && planId) {
        await prisma.subscription.upsert({
          where: { userId },
          update: {
            plan: planId,
            status: "active",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            paymentProvider: "stripe",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + (billingPeriod === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
            ),
          },
          create: {
            userId,
            plan: planId,
            status: "active",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            paymentProvider: "stripe",
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(
              Date.now() + (billingPeriod === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000,
            ),
          },
        })

        if (session.amount_total) {
          await prisma.payment.create({
            data: {
              userId,
              provider: "stripe",
              providerPaymentId: session.payment_intent as string,
              amount: session.amount_total,
              currency: session.currency || "usd",
              status: "succeeded",
              description: `HomeSchoolar ${planId} subscription`,
            },
          })
        }

        await prisma.notification.create({
          data: {
            userId,
            title: "Subscription Activated!",
            message: `Your ${planId} plan is now active. Enjoy full access to HomeSchoolar!`,
            type: "success",
          },
        })
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription & { current_period_end: number }
      const customerId = subscription.customer as string

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          status: subscription.status === "active" ? "active" : "past_due",
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      })
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object
      const customerId = subscription.customer as string

      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: { status: "cancelled" },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
