import "server-only"
import Stripe from "stripe"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeClient = stripeSecretKey ? new Stripe(stripeSecretKey) : null

export function requireStripe() {
  if (!stripeClient) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY to enable billing.")
  }
  return stripeClient
}
