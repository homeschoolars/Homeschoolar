"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api-client"

export function TrialCTA() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleStartTrial = async () => {
    setIsLoading(true)
    setMessage(null)
    try {
      const response = await apiFetch("/api/trial/start", { method: "POST" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Unable to start trial")
      }
      setMessage("Trial started! Refreshing...")
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start trial")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={handleStartTrial} disabled={isLoading} className="bg-teal-600 hover:bg-teal-700">
        {isLoading ? "Starting trial..." : "Start 7-day free trial"}
      </Button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  )
}
