"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { startCheckoutSession } from "@/app/actions/stripe"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutProps {
  planType: "monthly" | "yearly"
  trigger?: React.ReactNode
}

export function Checkout({ planType, trigger }: CheckoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchClientSecret = useCallback(async () => {
    setIsLoading(true)
    try {
      const clientSecret = await startCheckoutSession(planType)
      if (!clientSecret) {
        throw new Error("Failed to initialize Stripe checkout session.")
      }
      return clientSecret
    } finally {
      setIsLoading(false)
    }
  }, [planType])

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="w-full">
          Subscribe Now
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Subscription</DialogTitle>
            <DialogDescription>Secure payment powered by Stripe</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : (
            <div id="checkout" className="min-h-[400px]">
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
