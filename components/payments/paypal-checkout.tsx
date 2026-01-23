"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatPrice } from "@/lib/subscription-plans"

interface PayPalCheckoutProps {
  billingPeriod: "monthly" | "yearly"
  amount: number
  currency: "USD"
  trigger?: React.ReactNode
}

export function PayPalCheckout({ billingPeriod, amount, currency, trigger }: PayPalCheckoutProps) {
  const [isOpen, setIsOpen] = useState(false)

  // PayPal integration placeholder - requires PayPal SDK setup
  const handlePayPalPayment = async () => {
    // In production, integrate with PayPal SDK
    alert("PayPal integration coming soon! Please use Stripe for now.")
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="w-full bg-[#0070ba] text-white hover:bg-[#005ea6] border-0"
        >
          Pay with PayPal
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pay with PayPal</DialogTitle>
            <DialogDescription>
              Complete your subscription ({formatPrice(amount)}/{billingPeriod === "yearly" ? "year" : "month"})
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 text-center">
            <div className="mb-6">
              <img src="/paypal-logo.png" alt="PayPal" className="h-12 mx-auto" />
            </div>
            <Button
              onClick={handlePayPalPayment}
              className="w-full bg-[#ffc439] text-[#003087] hover:bg-[#f0b90b] font-semibold"
            >
              Continue with PayPal
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              You will be redirected to PayPal to complete your {currency} payment securely.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
