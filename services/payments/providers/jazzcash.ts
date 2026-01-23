import type { PaymentProviderAdapter } from "./types"
import { PaymentGateway } from "@prisma/client"
import { createJazzCashPayment, parseJazzCashWebhook, verifyJazzCashWebhook } from "@/lib/payments/jazzcash"

export const jazzcashProvider: PaymentProviderAdapter = {
  gateway: PaymentGateway.jazzcash,
  createPayment: async (params) => {
    const response = await createJazzCashPayment({
      amount: params.amount,
      currency: "PKR",
      referenceId: params.referenceId,
      returnUrl: params.returnUrl,
      webhookUrl: params.webhookUrl,
      customerEmail: params.customerEmail ?? undefined,
      customerPhone: params.customerPhone ?? undefined,
    })
    return { externalId: response.externalId, redirectUrl: response.redirectUrl }
  },
  verifyWebhook: verifyJazzCashWebhook,
  parseWebhook: (payload) => parseJazzCashWebhook(payload),
}
