"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

type EngagementRow = { subject: string; started: number; completed: number }

export function LowPerformingFlags() {
  const [items, setItems] = useState<EngagementRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/admin/analytics?range=30d")
      .then((r) => r.json())
      .then((d: { subjectEngagement?: EngagementRow[] }) => {
        const raw = d.subjectEngagement ?? []
        const low = raw.filter((r) => r.started > 0 && r.completed / r.started < 0.5)
        setItems(low)
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  const rate = (r: EngagementRow) =>
    r.started > 0 ? Math.round((100 * r.completed) / r.started) : 0

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Low-performing content
        </CardTitle>
        <CardDescription>Subjects with &lt;50% completion rate</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">None flagged</p>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div
                key={r.subject}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2"
              >
                <span className="text-sm font-medium text-slate-800">{r.subject}</span>
                <Badge variant="secondary" className="bg-amber-200 text-amber-900">
                  {rate(r)}% completed ({r.completed}/{r.started})
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
