export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  priceMonthly: number // in cents (USD)
  priceYearly: number // in cents (USD)
  priceMonthlyPKR: number // in PKR
  priceYearlyPKR: number // in PKR
  features: string[]
  popular?: boolean
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "trial",
    name: "Free Trial",
    description: "14-day full access",
    priceMonthly: 0,
    priceYearly: 0,
    priceMonthlyPKR: 0,
    priceYearlyPKR: 0,
    features: ["All AI features", "Unlimited worksheets", "Up to 3 children", "Email support"],
  },
  {
    id: "monthly",
    name: "Monthly",
    description: "Full access, billed monthly",
    priceMonthly: 3000, // $30.00
    priceYearly: 0,
    priceMonthlyPKR: 8500, // PKR 8,500
    priceYearlyPKR: 0,
    features: [
      "All AI features",
      "Unlimited worksheets",
      "Unlimited children",
      "Priority support",
      "PDF exports",
      "Email sharing",
    ],
    popular: true,
  },
  {
    id: "yearly",
    name: "Yearly",
    description: "Full access, save 17%",
    priceMonthly: 0,
    priceYearly: 30000, // $300.00
    priceMonthlyPKR: 0,
    priceYearlyPKR: 85000, // PKR 85,000
    features: [
      "All AI features",
      "Unlimited worksheets",
      "Unlimited children",
      "Priority support",
      "PDF exports",
      "Email sharing",
      "Early access to new features",
    ],
  },
]

export type PaymentMethod = "stripe" | "paypal" | "jazzcash" | "easypaisa" | "bank_transfer"

export interface PKRPaymentDetails {
  method: PaymentMethod
  name: string
  accountTitle: string
  accountNumber: string
  instructions: string
}

export const PKR_PAYMENT_METHODS: PKRPaymentDetails[] = [
  {
    method: "jazzcash",
    name: "JazzCash",
    accountTitle: "HomeSchoolar Education",
    accountNumber: "0300-1234567",
    instructions: "Send payment to the JazzCash number above and upload screenshot",
  },
  {
    method: "easypaisa",
    name: "Easypaisa",
    accountTitle: "HomeSchoolar Education",
    accountNumber: "0345-1234567",
    instructions: "Send payment to the Easypaisa number above and upload screenshot",
  },
  {
    method: "bank_transfer",
    name: "Bank Transfer",
    accountTitle: "HomeSchoolar Education Pvt Ltd",
    accountNumber: "PK36MEZN0099340012345678",
    instructions: "Transfer to Meezan Bank account and upload receipt. IBAN: PK36MEZN0099340012345678",
  },
]

export function getPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id)
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function formatPricePKR(pkr: number): string {
  return `PKR ${pkr.toLocaleString()}`
}
