"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

type EngagementRow = { subject: string; started: number; completed: number }

const chartConfig = {
  subject: { label: "Subject" },
  started: { label: "Started", color: "hsl(var(--chart-1))" },
  completed: { label: "Completed", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig

export function LearningAnalytics() {
  const [engagement, setEngagement] = useState<EngagementRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/admin/analytics?range=30d")
      .then((r) => r.json())
      .then((d: { subjectEngagement?: EngagementRow[] }) => setEngagement(d.subjectEngagement ?? []))
      .catch(() => setEngagement([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[240px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-600" />
          Learning analytics
        </CardTitle>
        <CardDescription>Aggregate subject engagement (assignments started vs completed)</CardDescription>
      </CardHeader>
      <CardContent>
        {engagement.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No engagement data</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart data={engagement} layout="vertical" margin={{ left: 80, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis type="category" dataKey="subject" width={72} tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="started" fill="var(--color-started)" radius={[0, 2, 2, 0]} />
              <Bar dataKey="completed" fill="var(--color-completed)" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
