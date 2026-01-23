"use client"

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { SubscriptionCard } from "./subscription-card"
import { apiFetch } from "@/lib/api-client"
import type { SubscriptionPlanType, SubscriptionPricingPreview } from "@/lib/types"

interface PricingSectionProps {
  currentPlan?: SubscriptionPlanType | null
}

export function PricingSection({ currentPlan }: PricingSectionProps) {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly")
  const [pricing, setPricing] = useState<SubscriptionPricingPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const yearlyDiscount = 15

  useEffect(() => {
    const fetchPricing = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await apiFetch("/api/subscriptions/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planType: billingPeriod }),
        })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Unable to load pricing")
        }
        setPricing(data.pricing)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load pricing")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPricing()
  }, [billingPeriod])

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
          <span className="ml-1 text-xs text-teal-600 font-normal">
            Save {yearlyDiscount}%
          </span>
        </Label>
      </div>

      {/* Plan Cards */}
      <div className="grid gap-6 md:grid-cols-1 max-w-3xl mx-auto">
        {isLoading && <p className="text-center text-sm text-gray-500">Loading pricing...</p>}
        {error && <p className="text-center text-sm text-red-500">{error}</p>}
        {pricing && (
          <SubscriptionCard pricing={pricing} currentPlan={currentPlan} billingPeriod={billingPeriod} />
        )}
      </div>
    </div>
  )
}
