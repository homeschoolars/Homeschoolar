"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Share2, Mail, Loader2, Check, AlertCircle } from "lucide-react"

interface ShareDialogProps {
  pdfType: "worksheet" | "answer-key" | "curriculum" | "assessment" | "recommendations"
  data: Record<string, unknown>
  title: string
  children?: React.ReactNode
}

export function ShareDialog({ pdfType, data, title, children }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

  const handleShare = async () => {
    if (!email) return

    setIsSending(true)
    setStatus("idle")

    try {
      const response = await fetch("/api/share/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfType,
          data,
          email,
          message,
          title,
        }),
      })

      if (!response.ok) throw new Error("Failed to send email")

      setStatus("success")
      setTimeout(() => {
        setIsOpen(false)
        setEmail("")
        setMessage("")
        setStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("Error sharing:", error)
      setStatus("error")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share via Email</DialogTitle>
          <DialogDescription>Send "{title}" as a PDF attachment to an email address.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="parent@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <Check className="w-5 h-5" />
              <span>Email sent successfully!</span>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>Failed to send email. Please try again.</span>
            </div>
          )}

          <Button onClick={handleShare} disabled={!email || isSending} className="w-full bg-teal-600 hover:bg-teal-700">
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
