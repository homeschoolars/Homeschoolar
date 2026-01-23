import type { BillingCurrency, SubscriptionPlanType } from "@/lib/types"

const YEARLY_DISCOUNT_PERCENTAGE = 15

const MONTHLY_PRICE_TIERS_USD_CENTS = [
  { maxChildren: 1, monthlyPriceCents: 2999 },
  { maxChildren: 2, monthlyPriceCents: 5499 },
  { maxChildren: 3, monthlyPriceCents: 7000 },
  { maxChildren: Infinity, monthlyPriceCents: 9000 },
]

function getExchangeRateUsdToPkr() {
  const rate = Number(process.env.PKR_PER_USD ?? "280")
  return Number.isFinite(rate) && rate > 0 ? rate : 280
}

function toCurrencyAmount(usdCents: number, currency: BillingCurrency) {
  if (currency === "USD") return usdCents
  const usd = usdCents / 100
  return Math.round(usd * getExchangeRateUsdToPkr())
}

export function getMonthlyPriceUsdCents(childCount: number) {
  if (childCount <= 0) {
    throw new Error("Child count must be at least 1")
  }
  const tier = MONTHLY_PRICE_TIERS_USD_CENTS.find((entry) => childCount <= entry.maxChildren)
  if (!tier) {
    throw new Error("Unable to determine pricing tier")
  }
  return tier.monthlyPriceCents
}

export function buildPricing({
  childCount,
  planType,
  currency,
}: {
  childCount: number
  planType: SubscriptionPlanType
  currency: BillingCurrency
}) {
  const baseMonthlyUsdCents = getMonthlyPriceUsdCents(childCount)
  const baseYearlyUsdCents = baseMonthlyUsdCents * 12
  const yearlyDiscountUsdCents = Math.round(baseYearlyUsdCents * (YEARLY_DISCOUNT_PERCENTAGE / 100))
  const yearlyFinalUsdCents = baseYearlyUsdCents - yearlyDiscountUsdCents

  const monthlyPrice = toCurrencyAmount(baseMonthlyUsdCents, currency)
  const yearlyPrice = toCurrencyAmount(yearlyFinalUsdCents, currency)
  const savingsAmount = toCurrencyAmount(yearlyDiscountUsdCents, currency)
  const discountAmount = planType === "yearly" ? savingsAmount : 0
  const baseYearlyPrice = toCurrencyAmount(baseYearlyUsdCents, currency)
  const baseMonthlyPrice = toCurrencyAmount(baseMonthlyUsdCents, currency)
  const finalAmount = planType === "yearly" ? yearlyPrice : monthlyPrice

  return {
    childCount,
    currency,
    monthlyPrice,
    yearlyPrice,
    baseMonthlyPrice,
    baseYearlyPrice,
    discountPercentage: planType === "yearly" ? YEARLY_DISCOUNT_PERCENTAGE : 0,
    discountAmount,
    savingsAmount,
    finalAmount,
    perChildMonthly: Math.round(monthlyPrice / childCount),
    perChildYearly: Math.round(yearlyPrice / childCount),
  }
}
