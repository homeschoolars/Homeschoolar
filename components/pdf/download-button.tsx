"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

interface DownloadButtonProps {
  pdfType: "worksheet" | "answer-key" | "curriculum" | "assessment" | "recommendations" | "insights"
  data: Record<string, unknown>
  fileName?: string
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  children?: React.ReactNode
}

export function DownloadButton({
  pdfType,
  data,
  fileName,
  variant = "outline",
  size = "sm",
  className,
  children,
}: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDownload = async () => {
    setIsLoading(true)
    try {
      const response = await apiFetch(`/api/pdf/${pdfType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to generate PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName || `${pdfType}-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading PDF:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant={variant} size={size} onClick={handleDownload} disabled={isLoading} className={className}>
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          {children || "Download PDF"}
        </>
      )}
    </Button>
  )
}
