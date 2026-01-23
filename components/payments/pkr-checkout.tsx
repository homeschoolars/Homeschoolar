"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Copy, Check, Loader2, Smartphone, Building2, Wallet } from "lucide-react"
import { PKR_PAYMENT_METHODS, type PaymentMethod, formatPricePKR } from "@/lib/subscription-plans"
import { apiFetch } from "@/lib/api-client"

interface PKRCheckoutProps {
  planType: "monthly" | "yearly"
  billingPeriod: "monthly" | "yearly"
  pricePKR: number
  trigger?: React.ReactNode
}

export function PKRCheckout({ planType, billingPeriod, pricePKR, trigger }: PKRCheckoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("jazzcash")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [transactionId, setTransactionId] = useState("")
  const [senderNumber, setSenderNumber] = useState("")
  const [notes, setNotes] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!screenshot) return

    setIsSubmitting(true)
    try {
      const receiptBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Failed to read receipt file"))
        reader.readAsDataURL(screenshot)
      })

      const response = await apiFetch("/api/payments/pkr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType,
          billingPeriod,
          paymentMethod: selectedMethod,
          transactionId,
          senderNumber,
          notes,
          receiptName: screenshot.name,
          receiptBase64,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit payment")
      }

      setSubmitted(true)
    } catch (error) {
      console.error("Error:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case "jazzcash":
        return <Smartphone className="w-5 h-5 text-red-500" />
      case "easypaisa":
        return <Wallet className="w-5 h-5 text-green-500" />
      case "bank_transfer":
        return <Building2 className="w-5 h-5 text-blue-500" />
      default:
        return null
    }
  }

  const getMethodColor = (method: PaymentMethod) => {
    switch (method) {
      case "jazzcash":
        return "border-red-200 bg-red-50"
      case "easypaisa":
        return "border-green-200 bg-green-50"
      case "bank_transfer":
        return "border-blue-200 bg-blue-50"
      default:
        return ""
    }
  }

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          Pay with PKR
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">🇵🇰 Pakistan Payment Options</DialogTitle>
            <DialogDescription>
              Pay {formatPricePKR(pricePKR)} via JazzCash, Easypaisa, or Bank Transfer
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-green-700">Payment Submitted!</h3>
              <p className="text-gray-600">
                Your payment is being verified. You will receive an email confirmation within 24 hours.
              </p>
              <Button onClick={() => setIsOpen(false)} className="mt-4">
                Close
              </Button>
            </div>
          ) : (
            <Tabs value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="jazzcash" className="text-xs">
                  <Smartphone className="w-4 h-4 mr-1" /> JazzCash
                </TabsTrigger>
                <TabsTrigger value="easypaisa" className="text-xs">
                  <Wallet className="w-4 h-4 mr-1" /> Easypaisa
                </TabsTrigger>
                <TabsTrigger value="bank_transfer" className="text-xs">
                  <Building2 className="w-4 h-4 mr-1" /> Bank
                </TabsTrigger>
              </TabsList>

              {PKR_PAYMENT_METHODS.map((method) => (
                <TabsContent key={method.method} value={method.method} className="space-y-4 mt-4">
                  {/* Payment Details Card */}
                  <Card className={`${getMethodColor(method.method)} border-2`}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Amount</span>
                        <Badge variant="secondary" className="text-lg font-bold">
                          {formatPricePKR(pricePKR)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Account Title</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{method.accountTitle}</span>
                          <button
                            onClick={() => handleCopy(method.accountTitle, "title")}
                            className="p-1 hover:bg-white/50 rounded"
                          >
                            {copied === "title" ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {method.method === "bank_transfer" ? "IBAN" : "Number"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{method.accountNumber}</span>
                          <button
                            onClick={() => handleCopy(method.accountNumber, "number")}
                            className="p-1 hover:bg-white/50 rounded"
                          >
                            {copied === "number" ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 bg-white/50 p-2 rounded">{method.instructions}</p>
                    </CardContent>
                  </Card>

                  {/* Payment Verification Form */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="transactionId">Transaction ID / Reference</Label>
                      <Input
                        id="transactionId"
                        placeholder="Enter transaction ID"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="senderNumber">
                        {method.method === "bank_transfer" ? "Your Bank Account" : "Sender Mobile Number"}
                      </Label>
                      <Input
                        id="senderNumber"
                        placeholder={method.method === "bank_transfer" ? "Your bank account number" : "03XX-XXXXXXX"}
                        value={senderNumber}
                        onChange={(e) => setSenderNumber(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="screenshot">Upload Payment Screenshot / Receipt</Label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                          screenshot
                            ? "border-green-400 bg-green-50"
                            : "border-gray-300 hover:border-teal-400 hover:bg-teal-50"
                        }`}
                      >
                        {screenshot ? (
                          <div className="flex items-center justify-center gap-2 text-green-700">
                            <Check className="w-5 h-5" />
                            <span>{screenshot.name}</span>
                          </div>
                        ) : (
                          <div className="text-gray-500">
                            <Upload className="w-8 h-8 mx-auto mb-2" />
                            <p>Click to upload screenshot</p>
                            <p className="text-xs mt-1">PNG, JPG or PDF</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Additional Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional information..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <Button
                      onClick={handleSubmit}
                      disabled={!screenshot || !transactionId || isSubmitting}
                      className="w-full bg-gradient-to-r from-teal-500 to-emerald-600"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Payment for Verification"
                      )}
                    </Button>

                    <p className="text-xs text-center text-gray-500">
                      Your subscription will be activated within 24 hours after verification
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
