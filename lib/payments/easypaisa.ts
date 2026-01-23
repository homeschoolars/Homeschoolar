import crypto from "crypto"

export type EasyPaisaCreateRequest = {
  amount: number
  currency: "PKR"
  referenceId: string
  returnUrl: string
  webhookUrl: string
  customerEmail?: string | null
  customerPhone?: string | null
}

export type EasyPaisaCreateResponse = {
  externalId: string
  redirectUrl: string
  metadata?: Record<string, unknown>
}

export type EasyPaisaWebhookEvent = {
  externalId: string
  status: "succeeded" | "failed" | "pending"
  amount: number
  currency: string
  referenceId?: string
  metadata?: Record<string, unknown>
}

const EASYPAISA_API_BASE = process.env.EASYPAISA_API_BASE || "https://sandbox.easypaisa.com.pk"
const EASYPAISA_MERCHANT_ID = process.env.EASYPAISA_MERCHANT_ID || ""
const EASYPAISA_API_KEY = process.env.EASYPAISA_API_KEY || ""
const EASYPAISA_WEBHOOK_SECRET = process.env.EASYPAISA_WEBHOOK_SECRET || ""

export async function createEasyPaisaPayment(request: EasyPaisaCreateRequest): Promise<EasyPaisaCreateResponse> {
  const response = await fetch(`${EASYPAISA_API_BASE}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Merchant-Id": EASYPAISA_MERCHANT_ID,
      "X-Api-Key": EASYPAISA_API_KEY,
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
    throw new Error(`EasyPaisa create failed: ${text}`)
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

export function verifyEasyPaisaWebhook(rawBody: string, signatureHeader: string | null) {
  if (!EASYPAISA_WEBHOOK_SECRET) {
    throw new Error("EasyPaisa webhook secret not configured")
  }

  const signature = signatureHeader?.replace("sha256=", "") || ""
  const expected = crypto.createHmac("sha256", EASYPAISA_WEBHOOK_SECRET).update(rawBody).digest("hex")
  if (signature !== expected) {
    throw new Error("Invalid EasyPaisa webhook signature")
  }
}

export function parseEasyPaisaWebhook(payload: Record<string, unknown>): EasyPaisaWebhookEvent {
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
