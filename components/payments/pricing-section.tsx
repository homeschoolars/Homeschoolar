"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { SubscriptionCard } from "./subscription-card"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"

interface PricingSectionProps {
  currentPlan?: string
}

export function PricingSection({ currentPlan }: PricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")

  return (
    <div className="space-y-8">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Label htmlFor="billing" className={billingPeriod === "monthly" ? "font-semibold" : "text-gray-500"}>
          Monthly
        </Label>
        <Switch
          id="billing"
          checked={billingPeriod === "yearly"}
          onCheckedChange={(checked) => setBillingPeriod(checked ? "yearly" : "monthly")}
        />
        <Label htmlFor="billing" className={billingPeriod === "yearly" ? "font-semibold" : "text-gray-500"}>
          Yearly
          <span className="ml-1 text-xs text-teal-600 font-normal">Save 35%</span>
        </Label>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <SubscriptionCard key={plan.id} plan={plan} currentPlan={currentPlan} billingPeriod={billingPeriod} />
        ))}
      </div>
    </div>
  )
}
