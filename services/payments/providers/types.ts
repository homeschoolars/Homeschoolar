import type { PaymentGateway } from "@prisma/client"

export type ProviderCreateParams = {
  amount: number
  currency: string
  referenceId: string
  returnUrl: string
  webhookUrl: string
  customerEmail?: string | null
  customerPhone?: string | null
}

export type ProviderCreateResult = {
  externalId: string
  redirectUrl: string
}

export type ProviderWebhookEvent = {
  externalId: string
  status: "succeeded" | "failed" | "pending"
  amount: number
  currency: string
  referenceId?: string
  metadata?: Record<string, unknown>
}

export interface PaymentProviderAdapter {
  gateway: PaymentGateway
  createPayment(params: ProviderCreateParams): Promise<ProviderCreateResult>
  verifyWebhook(rawBody: string, signature: string | null): void
  parseWebhook(payload: Record<string, unknown>): ProviderWebhookEvent
}
