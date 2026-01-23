import type { PaymentProviderAdapter } from "./types"
import { PaymentGateway } from "@prisma/client"
import { createPayoneerPayment, parsePayoneerWebhook, verifyPayoneerWebhook } from "@/lib/payments/payoneer"

export const payoneerProvider: PaymentProviderAdapter = {
  gateway: PaymentGateway.payoneer,
  createPayment: async (params) => {
    const response = await createPayoneerPayment({
      amount: params.amount,
      currency: params.currency === "EUR" ? "EUR" : "USD",
      referenceId: params.referenceId,
      returnUrl: params.returnUrl,
      webhookUrl: params.webhookUrl,
      customerEmail: params.customerEmail ?? undefined,
    })
    return { externalId: response.externalId, redirectUrl: response.redirectUrl }
  },
  verifyWebhook: verifyPayoneerWebhook,
  parseWebhook: (payload) => parsePayoneerWebhook(payload),
}
