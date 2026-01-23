import crypto from "crypto"

export type PayoneerCreateRequest = {
  amount: number
  currency: "USD" | "EUR"
  referenceId: string
  returnUrl: string
  webhookUrl: string
  customerEmail?: string | null
}

export type PayoneerCreateResponse = {
  externalId: string
  redirectUrl: string
  metadata?: Record<string, unknown>
}

export type PayoneerWebhookEvent = {
  externalId: string
  status: "succeeded" | "failed" | "pending"
  amount: number
  currency: string
  referenceId?: string
  metadata?: Record<string, unknown>
}

const PAYONEER_API_BASE = process.env.PAYONEER_API_BASE || "https://sandbox.payoneer.com"
const PAYONEER_API_KEY = process.env.PAYONEER_API_KEY || ""
const PAYONEER_WEBHOOK_SECRET = process.env.PAYONEER_WEBHOOK_SECRET || ""

export async function createPayoneerPayment(request: PayoneerCreateRequest): Promise<PayoneerCreateResponse> {
  const response = await fetch(`${PAYONEER_API_BASE}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PAYONEER_API_KEY}`,
    },
    body: JSON.stringify({
      amount: request.amount,
      currency: request.currency,
      reference_id: request.referenceId,
      return_url: request.returnUrl,
      webhook_url: request.webhookUrl,
      customer_email: request.customerEmail,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Payoneer create failed: ${text}`)
  }

  const data = (await response.json()) as {
    id: string
    redirect_url: string
    metadata?: Record<string, unknown>
  }

  return {
    externalId: data.id,
    redirectUrl: data.redirect_url,
    metadata: data.metadata,
  }
}

export function verifyPayoneerWebhook(rawBody: string, signatureHeader: string | null) {
  if (!PAYONEER_WEBHOOK_SECRET) {
    throw new Error("Payoneer webhook secret not configured")
  }

  const signature = signatureHeader?.replace("sha256=", "") || ""
  const expected = crypto.createHmac("sha256", PAYONEER_WEBHOOK_SECRET).update(rawBody).digest("hex")
  if (signature !== expected) {
    throw new Error("Invalid Payoneer webhook signature")
  }
}

export function parsePayoneerWebhook(payload: Record<string, unknown>): PayoneerWebhookEvent {
  const status = String(payload.status || "").toLowerCase()
  const normalizedStatus =
    status === "success" || status === "succeeded"
      ? "succeeded"
      : status === "failed"
        ? "failed"
        : "pending"

  return {
    externalId: String(payload.id || payload.transaction_id || ""),
    status: normalizedStatus,
    amount: Number(payload.amount || 0),
    currency: String(payload.currency || ""),
    referenceId: payload.reference_id ? String(payload.reference_id) : undefined,
    metadata: (payload.metadata as Record<string, unknown>) || undefined,
  }
}
