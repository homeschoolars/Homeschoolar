"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, Star, Sparkles, Rocket, Crown, Globe, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const PKR_PER_USD = 280

const FREE_TRIAL = {
  name: "Free Trial",
  description: "Try everything free for 7 days",
  priceUSD: "$0",
  pricePKR: "PKR 0",
  period: "for 7 days",
  features: [
    "Up to 2 children",
    "All subjects included",
    "AI worksheet generation",
    "Auto-grading",
    "Progress tracking",
    "Email support",
  ],
  cta: "Start Free Trial",
  href: "/signup",
  color: "green",
  bgGradient: "from-green to-cyan",
  icon: Rocket,
  emoji: "🚀",
}

const PER_CHILD_TIERS = [
  { children: 1, label: "1 child", monthlyUsd: 29.99, yearlyUsd: 305.98 },
  { children: 2, label: "2 children", monthlyUsd: 54.99, yearlyUsd: 560.98 },
  { children: 3, label: "3 children", monthlyUsd: 70, yearlyUsd: 714 },
  { children: 4, label: "4+ children", monthlyUsd: 90, yearlyUsd: 918 },
]

const FAMILY_FEATURES = [
  "All subjects included",
  "AI worksheets & auto-grading",
  "Progress analytics",
  "Curriculum recommendations",
  "PDF exports",
  "Priority support",
]

export function Pricing() {
  const [currency, setCurrency] = useState<"usd" | "pkr">("usd")
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly")

  const formatPrice = (usd: number) => {
    if (currency === "usd") return `$${usd % 1 ? usd.toFixed(2) : usd}`
    return `PKR ${Math.round(usd * PKR_PER_USD).toLocaleString()}`
  }

  return (
    <section
      id="pricing"
      className="py-20 md:py-28 bg-gradient-to-b from-yellow/5 via-orange/5 to-pink/5 relative overflow-hidden"
    >
      <Star className="absolute left-10 top-24 h-8 w-8 text-yellow fill-yellow animate-wiggle opacity-50" />
      <Sparkles className="absolute right-16 bottom-20 h-6 w-6 text-purple animate-float opacity-40" />

      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Simple, <span className="text-rainbow">Transparent</span> Pricing
            <Sparkles className="inline-block h-8 w-8 text-yellow ml-2 animate-pulse" />
          </h2>
          <p className="mt-4 text-lg text-foreground/70 text-pretty">
            Start with a free trial. Pricing is per child—no hidden fees.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setCurrency("usd")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  currency === "usd"
                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg"
                    : "bg-white/80 text-gray-600 hover:bg-white border border-gray-200",
                )}
              >
                <Globe className="w-4 h-4" />
                USD ($)
              </button>
              <button
                onClick={() => setCurrency("pkr")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  currency === "pkr"
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                    : "bg-white/80 text-gray-600 hover:bg-white border border-gray-200",
                )}
              >
                🇵🇰 PKR (Rs)
              </button>
            </div>
          </div>
          {currency === "pkr" && (
            <p className="mt-2 text-sm text-green-600 font-medium animate-pulse">
              Pay via JazzCash, Easypaisa, or Bank Transfer!
            </p>
          )}
        </div>

        {/* Free Trial */}
        <div className="mx-auto mt-10 max-w-md">
          <div
            className="relative flex flex-col rounded-3xl border-3 bg-white p-6 shadow-xl border-green"
            style={{ borderColor: "var(--green)" }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green to-cyan shadow-lg mb-4">
              <Rocket className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
              {FREE_TRIAL.name} <span className="text-2xl">{FREE_TRIAL.emoji}</span>
            </h3>
            <p className="mt-1 text-sm text-foreground/60">{FREE_TRIAL.description}</p>
            <p className="mt-2">
              <span className="font-bold text-2xl text-green">
                {currency === "pkr" ? FREE_TRIAL.pricePKR : FREE_TRIAL.priceUSD}
              </span>
              <span className="text-foreground/60"> {FREE_TRIAL.period}</span>
            </p>
            <ul className="mt-4 space-y-2">
              {FREE_TRIAL.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-green shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full font-bold bg-gradient-to-r from-green to-cyan hover:opacity-90">
              <Link href={FREE_TRIAL.href}>{FREE_TRIAL.cta}</Link>
            </Button>
          </div>
        </div>

        {/* Per-child family plans */}
        <div className="mt-14 max-w-4xl mx-auto">
          <h3 className="font-heading text-2xl font-bold text-center mb-2 flex items-center justify-center gap-2">
            <Users className="h-7 w-7 text-purple" />
            Family plans — pay per child
          </h3>
          <p className="text-center text-foreground/70 text-sm mb-6">
            Save 15% with yearly billing
          </p>

          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setBilling("monthly")}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold transition-all",
                billing === "monthly"
                  ? "bg-gradient-to-r from-purple to-pink text-white shadow-lg"
                  : "bg-white border-2 border-purple/30 text-purple hover:bg-purple/5",
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold transition-all",
                billing === "yearly"
                  ? "bg-gradient-to-r from-purple to-pink text-white shadow-lg"
                  : "bg-white border-2 border-purple/30 text-purple hover:bg-purple/5",
              )}
            >
              Yearly <span className="text-green-600">(Save 15%)</span>
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PER_CHILD_TIERS.map((tier, i) => {
              const total = billing === "monthly" ? tier.monthlyUsd : tier.yearlyUsd
              const perChild = total / tier.children
              const period = billing === "monthly" ? "month" : "year"
              const isPopular = tier.children === 2
              return (
                <div
                  key={tier.label}
                  className={cn(
                    "relative flex flex-col rounded-2xl border-2 bg-white p-5 shadow-lg",
                    isPopular && "ring-2 ring-purple/30 shadow-purple/20",
                  )}
                  style={{ borderColor: "var(--purple)" }}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple to-pink px-3 py-1 text-xs font-bold text-white flex items-center gap-1">
                      <Crown className="h-3 w-3" /> Popular
                    </span>
                  )}
                  <h4 className="font-heading font-bold text-lg text-foreground">{tier.label}</h4>
                  <div className="mt-3">
                    <span className="font-bold text-2xl text-purple">{formatPrice(total)}</span>
                    <span className="text-foreground/60 text-sm">/{period}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground/70">
                    <span className="font-semibold text-purple">{formatPrice(perChild)}</span> per child
                  </p>
                  <ul className="mt-4 flex-1 space-y-1.5">
                    {FAMILY_FEATURES.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                        <Check className="h-3.5 w-3.5 text-purple shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" className="mt-4 w-full border-2 border-purple/40 text-purple hover:bg-purple/10">
                    <Link href={`/signup?plan=${billing}&children=${tier.children}`}>Get Started</Link>
                  </Button>
                </div>
              )
            })}
          </div>
        </div>

        {currency === "pkr" && (
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
              <h3 className="font-heading text-lg font-bold text-green-800 mb-3">🇵🇰 Pakistan Payment Methods</h3>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-red-500 font-bold">JazzCash</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-green-500 font-bold">Easypaisa</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
                  <span className="text-blue-500 font-bold">Bank Transfer</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-green-700">
                Select your preferred payment method after signup. Payments verified within 24 hours.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
