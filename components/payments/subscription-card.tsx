"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Star, CreditCard } from "lucide-react"
import { Checkout } from "./checkout"
import { PayPalCheckout } from "./paypal-checkout"
import { PKRCheckout } from "./pkr-checkout"
import { type SubscriptionPlan, formatPrice, formatPricePKR } from "@/lib/subscription-plans"

interface SubscriptionCardProps {
  plan: SubscriptionPlan
  currentPlan?: string
  billingPeriod: "monthly" | "yearly"
}

export function SubscriptionCard({ plan, currentPlan, billingPeriod }: SubscriptionCardProps) {
  const [paymentMethod, setPaymentMethod] = useState<"international" | "pakistan">("international")
  const [intlMethod, setIntlMethod] = useState<"stripe" | "paypal">("stripe")

  const priceUSD = billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly
  const pricePKR = billingPeriod === "yearly" ? plan.priceYearlyPKR : plan.priceMonthlyPKR
  const isCurrentPlan = currentPlan === plan.id
  const isFree = priceUSD === 0

  return (
    <Card
      className={`relative ${
        plan.popular ? "border-2 border-teal-500 shadow-lg shadow-teal-100" : ""
      } ${isCurrentPlan ? "ring-2 ring-green-500" : ""}`}
    >
      {plan.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500">
          <Star className="w-3 h-3 mr-1" /> Most Popular
        </Badge>
      )}
      {isCurrentPlan && <Badge className="absolute -top-3 right-4 bg-green-500">Current Plan</Badge>}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="text-center">
        {/* Price Display with Currency Toggle */}
        <div className="mb-4">
          {paymentMethod === "international" ? (
            <div>
              <span className="text-4xl font-bold">{formatPrice(priceUSD)}</span>
              {!isFree && <span className="text-gray-500">/{billingPeriod === "yearly" ? "year" : "month"}</span>}
            </div>
          ) : (
            <div>
              <span className="text-3xl font-bold text-green-600">{formatPricePKR(pricePKR)}</span>
              {!isFree && <span className="text-gray-500">/{billingPeriod === "yearly" ? "year" : "month"}</span>}
            </div>
          )}
        </div>

        <ul className="space-y-3 text-left">
          {plan.features.map((feature, i) => (
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
        ) : isFree ? (
          <Button variant="outline" className="w-full bg-transparent">
            Start Free Trial
          </Button>
        ) : (
          <>
            {/* Region/Payment Type Toggle */}
            <div className="flex w-full rounded-lg border p-1 mb-2">
              <button
                onClick={() => setPaymentMethod("international")}
                className={`flex-1 py-1.5 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${
                  paymentMethod === "international" ? "bg-teal-500 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <CreditCard className="w-3 h-3" /> International
              </button>
              <button
                onClick={() => setPaymentMethod("pakistan")}
                className={`flex-1 py-1.5 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${
                  paymentMethod === "pakistan" ? "bg-green-500 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                🇵🇰 Pakistan
              </button>
            </div>

            {paymentMethod === "international" ? (
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
                  <Checkout planId={plan.id} billingPeriod={billingPeriod} />
                ) : (
                  <PayPalCheckout planId={plan.id} billingPeriod={billingPeriod} />
                )}
              </>
            ) : (
              /* Pakistan Payment Methods */
              <PKRCheckout planId={plan.id} billingPeriod={billingPeriod} pricePKR={pricePKR} />
            )}
          </>
        )}
      </CardFooter>
    </Card>
  )
}
