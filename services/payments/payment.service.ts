import { PaymentGateway } from "@prisma/client"
import { payoneerProvider } from "./providers/payoneer"
import { jazzcashProvider } from "./providers/jazzcash"
import { easypaisaProvider } from "./providers/easypaisa"
import type { PaymentProviderAdapter } from "./providers/types"

const providerRegistry: Record<PaymentGateway, PaymentProviderAdapter> = {
  [PaymentGateway.payoneer]: payoneerProvider,
  [PaymentGateway.jazzcash]: jazzcashProvider,
  [PaymentGateway.easypaisa]: easypaisaProvider,
}

export function getPaymentProvider(gateway: PaymentGateway) {
  const provider = providerRegistry[gateway]
  if (!provider) {
    throw new Error("Unsupported payment gateway")
  }
  return provider
}

export function resolveGateway(currency: string, requested?: PaymentGateway) {
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
