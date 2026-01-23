import { prisma } from "@/lib/prisma"
import { PaymentGateway, PaymentStatus } from "@prisma/client"
import {
  createPayoneerPayment,
  parsePayoneerWebhook,
  verifyPayoneerWebhook,
  type PayoneerWebhookEvent,
} from "@/lib/payments/payoneer"
import {
  createJazzCashPayment,
  parseJazzCashWebhook,
  verifyJazzCashWebhook,
  type JazzCashWebhookEvent,
} from "@/lib/payments/jazzcash"
import {
  createEasyPaisaPayment,
  parseEasyPaisaWebhook,
  verifyEasyPaisaWebhook,
  type EasyPaisaWebhookEvent,
} from "@/lib/payments/easypaisa"

export type CreatePaymentParams = {
  userId: string
  amount: number
  currency: "USD" | "EUR" | "PKR"
  gateway?: PaymentGateway
  returnUrl: string
  webhookBaseUrl: string
  customerEmail?: string | null
  customerPhone?: string | null
  metadata?: Record<string, unknown>
}

export type CreatePaymentResult = {
  redirectUrl: string
  externalId: string
  gateway: PaymentGateway
  subscriptionId: string
}

type NormalizedEvent = {
  externalId: string
  status: PaymentStatus
  amount: number
  currency: string
  referenceId?: string
  metadata?: Record<string, unknown>
}

function resolveGateway(currency: string, requested?: PaymentGateway) {
  if (currency === "USD" || currency === "EUR") {
    return PaymentGateway.payoneer
  }
  if (currency === "PKR") {
    if (requested === PaymentGateway.jazzcash || requested === PaymentGateway.easypaisa) {
      return requested
    }
    return PaymentGateway.jazzcash
  }
  throw new Error("Unsupported currency")
}

function normalizeStatus(status: "succeeded" | "failed" | "pending"): PaymentStatus {
  if (status === "succeeded") return PaymentStatus.succeeded
  if (status === "failed") return PaymentStatus.failed
  return PaymentStatus.pending
}

function normalizeEvent(
  event: PayoneerWebhookEvent | JazzCashWebhookEvent | EasyPaisaWebhookEvent,
): NormalizedEvent {
  return {
    externalId: event.externalId,
    status: normalizeStatus(event.status),
    amount: event.amount,
    currency: event.currency,
    referenceId: event.referenceId,
    metadata: event.metadata,
  }
}

async function logPaymentEvent(userId: string | null, eventType: string, eventData: Record<string, unknown>) {
  if (!userId) return
  await prisma.analyticsEvent.create({
    data: {
      userId,
      eventType,
      eventData: eventData as unknown as object,
    },
  })
}

export async function createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
  const gateway = resolveGateway(params.currency, params.gateway)
  const referenceId = `${params.userId}_${Date.now()}`

  const subscription = await prisma.subscription.upsert({
    where: { userId: params.userId },
    update: {
      gateway,
      amount: params.amount,
      currency: params.currency,
      status: "pending",
      startDate: new Date(),
      metadata: (params.metadata ?? {}) as unknown as object,
    },
    create: {
      userId: params.userId,
      plan: "trial",
      gateway,
      amount: params.amount,
      currency: params.currency,
      status: "pending",
      startDate: new Date(),
      metadata: (params.metadata ?? {}) as unknown as object,
    },
  })

  let externalId = ""
  let redirectUrl = ""

  if (gateway === PaymentGateway.payoneer) {
    const response = await createPayoneerPayment({
      amount: params.amount,
      currency: params.currency === "EUR" ? "EUR" : "USD",
      referenceId,
      returnUrl: params.returnUrl,
      webhookUrl: `${params.webhookBaseUrl}/api/payments/webhooks/payoneer`,
      customerEmail: params.customerEmail,
    })
    externalId = response.externalId
    redirectUrl = response.redirectUrl
  }

  if (gateway === PaymentGateway.jazzcash) {
    const response = await createJazzCashPayment({
      amount: params.amount,
      currency: "PKR",
      referenceId,
      returnUrl: params.returnUrl,
      webhookUrl: `${params.webhookBaseUrl}/api/payments/webhooks/jazzcash`,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
    })
    externalId = response.externalId
    redirectUrl = response.redirectUrl
  }

  if (gateway === PaymentGateway.easypaisa) {
    const response = await createEasyPaisaPayment({
      amount: params.amount,
      currency: "PKR",
      referenceId,
      returnUrl: params.returnUrl,
      webhookUrl: `${params.webhookBaseUrl}/api/payments/webhooks/easypaisa`,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
    })
    externalId = response.externalId
    redirectUrl = response.redirectUrl
  }

  await prisma.paymentTransaction.create({
    data: {
      userId: params.userId,
      subscriptionId: subscription.id,
      gateway,
      amount: params.amount,
      currency: params.currency,
      status: "pending",
      externalId,
      referenceId,
      metadata: (params.metadata ?? {}) as unknown as object,
    },
  })

  await logPaymentEvent(params.userId, "payment.created", {
    gateway,
    currency: params.currency,
    amount: params.amount,
    referenceId,
  })

  return { redirectUrl, externalId, gateway, subscriptionId: subscription.id }
}

async function applyPaymentUpdate({
  gateway,
  normalized,
}: {
  gateway: PaymentGateway
  normalized: NormalizedEvent
}) {
  const transaction = await prisma.paymentTransaction.findFirst({
    where: { externalId: normalized.externalId, gateway },
  })

  if (!transaction) {
    return
  }

  if (transaction.status === "succeeded" && normalized.status === "succeeded") {
    return
  }

  await prisma.paymentTransaction.update({
    where: { id: transaction.id },
    data: {
      status: normalized.status,
      metadata: (normalized.metadata ?? {}) as unknown as object,
    },
  })

  await prisma.subscription.update({
    where: { id: transaction.subscriptionId ?? undefined },
    data: {
      status: normalized.status === "succeeded" ? "active" : "past_due",
      endDate: normalized.status === "succeeded" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
    },
  })

  await logPaymentEvent(transaction.userId ?? null, "payment.updated", {
    gateway,
    status: normalized.status,
    externalId: normalized.externalId,
  })
}

export async function handlePayoneerWebhook(rawBody: string, signature: string | null) {
  verifyPayoneerWebhook(rawBody, signature)
  const payload = JSON.parse(rawBody) as Record<string, unknown>
  const normalized = normalizeEvent(parsePayoneerWebhook(payload))
  await applyPaymentUpdate({ gateway: PaymentGateway.payoneer, normalized })
}

export async function handleJazzCashWebhook(rawBody: string, signature: string | null) {
  verifyJazzCashWebhook(rawBody, signature)
  const payload = JSON.parse(rawBody) as Record<string, unknown>
  const normalized = normalizeEvent(parseJazzCashWebhook(payload))
  await applyPaymentUpdate({ gateway: PaymentGateway.jazzcash, normalized })
}

export async function handleEasyPaisaWebhook(rawBody: string, signature: string | null) {
  verifyEasyPaisaWebhook(rawBody, signature)
  const payload = JSON.parse(rawBody) as Record<string, unknown>
  const normalized = normalizeEvent(parseEasyPaisaWebhook(payload))
  await applyPaymentUpdate({ gateway: PaymentGateway.easypaisa, normalized })
}
