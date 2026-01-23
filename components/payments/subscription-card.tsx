"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { Checkout } from "./checkout"
import { PayPalCheckout } from "./paypal-checkout"
import { PKRCheckout } from "./pkr-checkout"
import { SUBSCRIPTION_FEATURES, formatPrice, formatPricePKR } from "@/lib/subscription-plans"
import type { SubscriptionPricingPreview, SubscriptionPlanType } from "@/lib/types"

interface SubscriptionCardProps {
  pricing: SubscriptionPricingPreview
  currentPlan?: SubscriptionPlanType | null
  billingPeriod: "monthly" | "yearly"
}

export function SubscriptionCard({ pricing, currentPlan, billingPeriod }: SubscriptionCardProps) {
  const [intlMethod, setIntlMethod] = useState<"stripe" | "paypal">("stripe")
  const price = billingPeriod === "yearly" ? pricing.yearly_price : pricing.monthly_price
  const perChild = billingPeriod === "yearly" ? pricing.per_child_yearly : pricing.per_child_monthly
  const isCurrentPlan = currentPlan === billingPeriod
  const isPKR = pricing.currency === "PKR"
  const paymentMethod = isPKR ? "pakistan" : "international"

  return (
    <Card className={`relative ${isCurrentPlan ? "ring-2 ring-green-500" : ""}`}>
      {isCurrentPlan && <Badge className="absolute -top-3 right-4 bg-green-500">Current Plan</Badge>}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Family Plan</CardTitle>
        <CardDescription>
          {pricing.child_count} {pricing.child_count === 1 ? "child" : "children"} on your account
        </CardDescription>
      </CardHeader>

      <CardContent className="text-center">
        {/* Price Display with Currency Toggle */}
        <div className="mb-4">
          {paymentMethod === "international" && !isPKR ? (
            <div>
              <span className="text-4xl font-bold">{formatPrice(price)}</span>
              <span className="text-gray-500">/{billingPeriod === "yearly" ? "year" : "month"}</span>
            </div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-green-600">{formatPricePKR(price)}</span>
              <span className="text-gray-500">/{billingPeriod === "yearly" ? "year" : "month"}</span>
            </div>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Per child: {isPKR ? formatPricePKR(perChild) : formatPrice(perChild)} /
            {billingPeriod === "yearly" ? "year" : "month"}
          </p>
          {billingPeriod === "yearly" && pricing.savings_amount > 0 && (
            <p className="mt-1 text-xs text-teal-600">
              You save {isPKR ? formatPricePKR(pricing.savings_amount) : formatPrice(pricing.savings_amount)} yearly
            </p>
          )}
        </div>

        <ul className="space-y-3 text-left">
          {SUBSCRIPTION_FEATURES.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {isCurrentPlan ? (
          <Button disabled className="w-full">
            Current Plan
          </Button>
        ) : (
          <>
            {paymentMethod === "international" && !isPKR ? (
              <>
                {/* International Payment Methods */}
                <div className="flex w-full rounded-lg border p-1 mb-2">
                  <button
                    onClick={() => setIntlMethod("stripe")}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                      intlMethod === "stripe" ? "bg-slate-800 text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    Card
                  </button>
                  <button
                    onClick={() => setIntlMethod("paypal")}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                      intlMethod === "paypal" ? "bg-[#0070ba] text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    PayPal
                  </button>
                </div>

                {intlMethod === "stripe" ? (
                  <Checkout planType={billingPeriod} />
                ) : (
                  <PayPalCheckout billingPeriod={billingPeriod} amount={price} currency="USD" />
                )}
              </>
            ) : (
              /* Pakistan Payment Methods */
              <PKRCheckout planType={billingPeriod} billingPeriod={billingPeriod} pricePKR={price} />
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}
