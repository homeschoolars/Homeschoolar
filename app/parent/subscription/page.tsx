import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { serializeSubscription } from "@/lib/serializers"
import { redirect } from "next/navigation"
import { PricingSection } from "@/components/payments/pricing-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, CreditCard, Calendar, CheckCircle } from "lucide-react"

export default async function SubscriptionPage() {
  const session = await auth()
  const user = session?.user

  if (!user) {
    redirect("/login")
  }

  const dbSubscription = await prisma.subscription.findFirst({ where: { userId: user.id } })
  const subscription = dbSubscription ? serializeSubscription(dbSubscription) : null

  const currentPlan = subscription?.plan || "none"
  const isActive = subscription?.status === "active"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/parent" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HomeSchoolar Logo" width={40} height={40} />
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              HomeSchoolar
            </span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/parent">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Link>
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription</h1>
        <p className="text-gray-600 mb-8">Manage your HomeSchoolar subscription</p>

        {/* Current Plan Card */}
        {isActive && (
          <Card className="mb-8 border-teal-200 bg-teal-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                Current Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl font-bold capitalize">{subscription.plan}</span>
                    <Badge className="bg-teal-500">Active</Badge>
                  </div>
                  {subscription.current_period_end && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/parent/subscription/manage">
                      <CreditCard className="w-4 h-4 mr-2" /> Manage Billing
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-center mb-6">
            {isActive ? "Change Your Plan" : "Choose Your Plan"}
          </h2>
          <PricingSection currentPlan={currentPlan} />
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium">Can I cancel anytime?</h4>
              <p className="text-sm text-gray-600">
                Yes! You can cancel your subscription at any time. You&apos;ll continue to have access until the end of
                your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-medium">What happens after my trial ends?</h4>
              <p className="text-sm text-gray-600">
                After your 14-day trial, you&apos;ll need to choose a paid plan to continue accessing all features. Your
                data will be saved.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Can I switch between monthly and yearly?</h4>
              <p className="text-sm text-gray-600">
                Yes! You can switch plans at any time. If upgrading to yearly, you&apos;ll be credited for your
                remaining monthly balance.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
