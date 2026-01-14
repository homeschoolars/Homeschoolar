"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, Star, Sparkles, Rocket, Crown, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Free Trial",
    description: "Try everything free for 14 days",
    priceUSD: "$0",
    pricePKR: "PKR 0",
    period: "for 14 days",
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
    highlighted: false,
    color: "green",
    bgGradient: "from-green to-cyan",
    icon: Rocket,
    emoji: "🚀",
  },
  {
    name: "Monthly",
    description: "Full access, billed monthly",
    priceUSD: "$30",
    pricePKR: "PKR 8,500",
    period: "/month",
    features: [
      "Unlimited children",
      "All subjects included",
      "AI worksheet generation",
      "Auto-grading with explanations",
      "Advanced progress analytics",
      "Curriculum recommendations",
      "PDF exports",
      "Priority support",
    ],
    cta: "Get Started",
    href: "/signup?plan=monthly",
    highlighted: true,
    color: "purple",
    bgGradient: "from-purple via-pink to-orange",
    icon: Crown,
    emoji: "👑",
  },
  {
    name: "Yearly",
    description: "Best value - save 17%",
    priceUSD: "$300",
    pricePKR: "PKR 85,000",
    period: "/year",
    features: [
      "Everything in Monthly",
      "Save $60 / PKR 17,000 per year",
      "Early access to new features",
      "Exclusive parent community",
      "Annual progress reports",
      "Dedicated success manager",
    ],
    cta: "Get Started",
    href: "/signup?plan=yearly",
    highlighted: false,
    color: "cyan",
    bgGradient: "from-cyan to-blue",
    icon: Star,
    emoji: "⭐",
  },
]

export function Pricing() {
  const [currency, setCurrency] = useState<"usd" | "pkr">("usd")

  return (
    <section
      id="pricing"
      className="py-20 md:py-28 bg-gradient-to-b from-yellow/5 via-orange/5 to-pink/5 relative overflow-hidden"
    >
      {/* Decorative elements */}
      <Star className="absolute left-10 top-24 h-8 w-8 text-yellow fill-yellow animate-wiggle opacity-50" />
      <Sparkles className="absolute right-16 bottom-20 h-6 w-6 text-purple animate-float opacity-40" />

      <div className="container mx-auto px-4 relative">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-4xl font-bold tracking-tight md:text-5xl text-balance">
            Simple, <span className="text-rainbow">Transparent</span> Pricing
            <Sparkles className="inline-block h-8 w-8 text-yellow ml-2 animate-pulse" />
          </h2>
          <p className="mt-4 text-lg text-foreground/70 text-pretty">
            Start with a free trial. No credit card required.
          </p>

          <div className="mt-6 flex items-center justify-center gap-2">
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
          {currency === "pkr" && (
            <p className="mt-2 text-sm text-green-600 font-medium animate-pulse">
              Pay via JazzCash, Easypaisa, or Bank Transfer!
            </p>
          )}
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
          {plans.map((plan, i) => {
            const Icon = plan.icon
            const displayPrice = currency === "pkr" ? plan.pricePKR : plan.priceUSD

            return (
              <div
                key={plan.name}
                className={cn(
                  "relative flex flex-col rounded-3xl border-3 bg-white p-6 shadow-xl transition-all hover:scale-105 animate-slide-up",
                  plan.highlighted ? "ring-4 ring-purple/20 shadow-2xl shadow-purple/20 scale-105 z-10" : "",
                )}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  borderColor: `var(--${plan.color})`,
                }}
              >
                {/* Popular badge */}
                {plan.highlighted && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple via-pink to-orange px-6 py-2 text-sm font-bold text-white shadow-lg flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Most Popular
                  </span>
                )}

                <div className="mb-6">
                  {/* Plan icon */}
                  <div
                    className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.bgGradient} shadow-lg`}
                  >
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
                    {plan.name}
                    <span className="text-2xl">{plan.emoji}</span>
                  </h3>
                  <p className="mt-1 text-sm text-foreground/60">{plan.description}</p>
                  <div className="mt-4">
                    <span
                      className={cn("font-bold", currency === "pkr" ? "text-3xl" : "text-5xl")}
                      style={{ color: `var(--${plan.color})` }}
                    >
                      {displayPrice}
                    </span>
                    <span className="text-foreground/60">{plan.period}</span>
                  </div>
                </div>

                <ul className="mb-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-foreground font-medium">
                      <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: `var(--${plan.color})` }} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  asChild
                  className={cn(
                    "w-full font-bold text-lg py-6 transition-all hover:scale-105",
                    plan.highlighted
                      ? "bg-gradient-to-r from-purple via-pink to-orange hover:opacity-90 shadow-lg"
                      : "",
                  )}
                  variant={plan.highlighted ? "default" : "outline"}
                  style={
                    !plan.highlighted ? { borderColor: `var(--${plan.color})`, color: `var(--${plan.color})` } : {}
                  }
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </div>
            )
          })}
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
