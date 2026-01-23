export const SUBSCRIPTION_FEATURES = [
  "All AI features",
  "Unlimited worksheets",
  "Multi-child management",
  "Priority support",
  "PDF exports",
  "Email sharing",
  "Progress analytics",
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

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function formatPricePKR(pkr: number): string {
  return `PKR ${pkr.toLocaleString()}`
}
