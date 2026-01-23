import crypto from "crypto"

export type JazzCashCreateRequest = {
  amount: number
  currency: "PKR"
  referenceId: string
  returnUrl: string
  webhookUrl: string
  customerEmail?: string | null
  customerPhone?: string | null
}

export type JazzCashCreateResponse = {
  externalId: string
  redirectUrl: string
  metadata?: Record<string, unknown>
}

export type JazzCashWebhookEvent = {
  externalId: string
  status: "succeeded" | "failed" | "pending"
  amount: number
  currency: string
  referenceId?: string
  metadata?: Record<string, unknown>
}

const JAZZCASH_API_BASE = process.env.JAZZCASH_API_BASE || "https://sandbox.jazzcash.com.pk"
const JAZZCASH_MERCHANT_ID = process.env.JAZZCASH_MERCHANT_ID || ""
const JAZZCASH_PASSWORD = process.env.JAZZCASH_PASSWORD || ""
const JAZZCASH_WEBHOOK_SECRET = process.env.JAZZCASH_WEBHOOK_SECRET || ""

export async function createJazzCashPayment(request: JazzCashCreateRequest): Promise<JazzCashCreateResponse> {
  const response = await fetch(`${JAZZCASH_API_BASE}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Merchant-Id": JAZZCASH_MERCHANT_ID,
      "X-Merchant-Password": JAZZCASH_PASSWORD,
    },
    body: JSON.stringify({
      amount: request.amount,
      currency: request.currency,
      reference_id: request.referenceId,
      return_url: request.returnUrl,
      webhook_url: request.webhookUrl,
      customer_email: request.customerEmail,
      customer_phone: request.customerPhone,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`JazzCash create failed: ${text}`)
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

export function verifyJazzCashWebhook(rawBody: string, signatureHeader: string | null) {
  if (!JAZZCASH_WEBHOOK_SECRET) {
    throw new Error("JazzCash webhook secret not configured")
  }

  const signature = signatureHeader?.replace("sha256=", "") || ""
  const expected = crypto.createHmac("sha256", JAZZCASH_WEBHOOK_SECRET).update(rawBody).digest("hex")
  if (signature !== expected) {
    throw new Error("Invalid JazzCash webhook signature")
  }
}

export function parseJazzCashWebhook(payload: Record<string, unknown>): JazzCashWebhookEvent {
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
