"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, X, Eye, Loader2, Smartphone, Wallet, Building2 } from "lucide-react"
import { formatPricePKR } from "@/lib/subscription-plans"
import { apiFetch } from "@/lib/api-client"

interface PendingPayment {
  id: string
  user_id: string
  full_name: string
  email: string
  amount: number
  currency: string
  payment_method: string
  metadata: {
    plan_id: string
    billing_period: string
    transaction_id: string
    sender_number: string
    notes: string
    receipt_name?: string
    receipt_base64?: string
  }
  created_at: string
  status: string
}

export function PKRPaymentVerification() {
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null)
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPendingPayments()
  }, [])

  const fetchPendingPayments = async () => {
    const response = await apiFetch("/api/admin/payments/pkr")
    const data = await response.json()
    if (response.ok && data.payments) {
      setPayments(data.payments)
    }
    setLoading(false)
  }

  const viewReceipt = async (payment: PendingPayment) => {
    setSelectedPayment(payment)
    if (payment.metadata?.receipt_base64) {
      setReceiptUrl(payment.metadata.receipt_base64)
    }
  }

  const approvePayment = async () => {
    if (!selectedPayment) return
    setProcessing(true)

    await apiFetch("/api/admin/payments/pkr", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: selectedPayment.id, status: "succeeded" }),
    })

    // Update user's subscription
    const endDate = new Date()
    if (selectedPayment.metadata.billing_period === "yearly") {
      endDate.setFullYear(endDate.getFullYear() + 1)
    } else {
      endDate.setMonth(endDate.getMonth() + 1)
    }

    await apiFetch("/api/admin/subscriptions/pkr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedPayment.user_id,
        planId: selectedPayment.metadata.plan_id,
        periodEnd: endDate.toISOString(),
      }),
    })

    await apiFetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedPayment.user_id,
        title: "Payment Verified!",
        message: `Your PKR payment of ${formatPricePKR(selectedPayment.amount)} has been verified. Your subscription is now active!`,
        type: "success",
        sendEmail: true,
      }),
    })

    setProcessing(false)
    setSelectedPayment(null)
    setReceiptUrl(null)
    fetchPendingPayments()
  }

  const rejectPayment = async () => {
    if (!selectedPayment || !rejectionReason) return
    setProcessing(true)

    await apiFetch("/api/admin/payments/pkr", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: selectedPayment.id, status: "failed", rejectionReason }),
    })

    await apiFetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedPayment.user_id,
        title: "Payment Issue",
        message: `Your PKR payment could not be verified. Reason: ${rejectionReason}. Please contact support or try again.`,
        type: "warning",
        sendEmail: true,
      }),
    })

    setProcessing(false)
    setSelectedPayment(null)
    setReceiptUrl(null)
    setRejectionReason("")
    fetchPendingPayments()
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "jazzcash":
        return <Smartphone className="w-4 h-4 text-red-500" />
      case "easypaisa":
        return <Wallet className="w-4 h-4 text-green-500" />
      case "bank_transfer":
        return <Building2 className="w-4 h-4 text-blue-500" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">🇵🇰 PKR Payment Verification</CardTitle>
          <CardDescription>Review and verify manual payments from Pakistan</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No pending PKR payments to verify</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.full_name}</p>
                        <p className="text-sm text-gray-500">{payment.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMethodIcon(payment.payment_method)}
                        <span className="capitalize">{payment.payment_method?.replace("_", " ")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{formatPricePKR(payment.amount)}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize">
                        {payment.metadata?.plan_id} ({payment.metadata?.billing_period})
                      </span>
                    </TableCell>
                    <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => viewReceipt(payment)}>
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog
        open={!!selectedPayment}
        onOpenChange={() => {
          setSelectedPayment(null)
          setReceiptUrl(null)
          setRejectionReason("")
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Payment</DialogTitle>
            <DialogDescription>Verify the payment details and receipt</DialogDescription>
          </DialogHeader>

          {selectedPayment && (
            <div className="space-y-4">
              {/* Payment Details */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-gray-500">User</Label>
                  <p className="font-medium">{selectedPayment.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedPayment.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Amount</Label>
                  <p className="font-medium text-lg">{formatPricePKR(selectedPayment.amount)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Transaction ID</Label>
                  <p className="font-mono">{selectedPayment.metadata?.transaction_id || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Sender Number</Label>
                  <p className="font-mono">{selectedPayment.metadata?.sender_number || "N/A"}</p>
                </div>
                {selectedPayment.metadata?.notes && (
                  <div className="col-span-2">
                    <Label className="text-gray-500">Notes</Label>
                    <p>{selectedPayment.metadata.notes}</p>
                  </div>
                )}
              </div>

              {/* Receipt Image */}
              {receiptUrl && (
                <div>
                  <Label className="text-gray-500 mb-2 block">Payment Receipt</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <img src={receiptUrl || "/placeholder.svg"} alt="Payment Receipt" className="max-w-full h-auto" />
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              <div>
                <Label htmlFor="rejection">Rejection Reason (if rejecting)</Label>
                <Textarea
                  id="rejection"
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={rejectPayment} disabled={processing || !rejectionReason}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
              Reject
            </Button>
            <Button onClick={approvePayment} disabled={processing} className="bg-green-600 hover:bg-green-700">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              Approve & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
