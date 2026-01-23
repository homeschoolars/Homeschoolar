import { prisma } from "@/lib/prisma"
import { PaymentGateway, PaymentStatus } from "@prisma/client"
import { getPaymentProvider, resolveGateway } from "@/services/payments/payment.service"
import type { ProviderWebhookEvent } from "@/services/payments/providers/types"

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

function normalizeStatus(status: "succeeded" | "failed" | "pending"): PaymentStatus {
  if (status === "succeeded") return PaymentStatus.succeeded
  if (status === "failed") return PaymentStatus.failed
  return PaymentStatus.pending
}

function normalizeEvent(event: ProviderWebhookEvent): NormalizedEvent {
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

  const provider = getPaymentProvider(gateway)
  const response = await provider.createPayment({
    amount: params.amount,
    currency: params.currency,
    referenceId,
    returnUrl: params.returnUrl,
    webhookUrl: `${params.webhookBaseUrl}/api/payments/webhooks/${gateway}`,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
  })

  await prisma.paymentTransaction.create({
    data: {
      userId: params.userId,
      subscriptionId: subscription.id,
      gateway,
      amount: params.amount,
      currency: params.currency,
      status: "pending",
      externalId: response.externalId,
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

  return { redirectUrl: response.redirectUrl, externalId: response.externalId, gateway, subscriptionId: subscription.id }
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
  const provider = getPaymentProvider(PaymentGateway.payoneer)
  provider.verifyWebhook(rawBody, signature)
  const payload = JSON.parse(rawBody) as Record<string, unknown>
  const normalized = normalizeEvent(provider.parseWebhook(payload))
  await applyPaymentUpdate({ gateway: PaymentGateway.payoneer, normalized })
}

export async function handleJazzCashWebhook(rawBody: string, signature: string | null) {
  const provider = getPaymentProvider(PaymentGateway.jazzcash)
  provider.verifyWebhook(rawBody, signature)
  const payload = JSON.parse(rawBody) as Record<string, unknown>
  const normalized = normalizeEvent(provider.parseWebhook(payload))
  await applyPaymentUpdate({ gateway: PaymentGateway.jazzcash, normalized })
}

export async function handleEasyPaisaWebhook(rawBody: string, signature: string | null) {
  const provider = getPaymentProvider(PaymentGateway.easypaisa)
  provider.verifyWebhook(rawBody, signature)
  const payload = JSON.parse(rawBody) as Record<string, unknown>
  const normalized = normalizeEvent(provider.parseWebhook(payload))
  await applyPaymentUpdate({ gateway: PaymentGateway.easypaisa, normalized })
}
