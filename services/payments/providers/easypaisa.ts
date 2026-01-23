import type { PaymentProviderAdapter } from "./types"
import { PaymentGateway } from "@prisma/client"
import { createEasyPaisaPayment, parseEasyPaisaWebhook, verifyEasyPaisaWebhook } from "@/lib/payments/easypaisa"

export const easypaisaProvider: PaymentProviderAdapter = {
  gateway: PaymentGateway.easypaisa,
  createPayment: async (params) => {
    const response = await createEasyPaisaPayment({
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
  verifyWebhook: verifyEasyPaisaWebhook,
  parseWebhook: (payload) => parseEasyPaisaWebhook(payload),
}
