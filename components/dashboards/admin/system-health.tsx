"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Database, Sparkles } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

type Health = {
  ok: boolean
  db: string
  openai_configured?: boolean
  openai_status?: "ok" | "missing" | "placeholder"
}

export function SystemHealth() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/health")
      .then((r) => r.json())
      .then((h) => setHealth(h as Health))
      .catch(() => setHealth(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">System health</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const dbOk = health?.ok && health?.db === "connected"
  const openaiOk = health?.openai_configured === true && health?.openai_status === "ok"

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-slate-600" />
          System health
        </CardTitle>
        <CardDescription>Database and AI status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium">Database</span>
          </div>
          <Badge variant={dbOk ? "default" : "destructive"} className={dbOk ? "bg-green-600" : ""}>
            {dbOk ? "Connected" : health?.db ?? "Error"}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-medium">OpenAI</span>
          </div>
          <Badge
            variant={openaiOk ? "default" : "secondary"}
            className={openaiOk ? "bg-green-600" : "bg-amber-100 text-amber-800"}
          >
            {health?.openai_status ?? "unknown"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
