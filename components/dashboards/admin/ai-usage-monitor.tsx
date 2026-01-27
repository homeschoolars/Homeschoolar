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
import { Sparkles } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

type AiUsageItem = { date: string; worksheets: number; quizzes: number; recommendations: number }

const chartConfig = {
  date: { label: "Date" },
  worksheets: { label: "Worksheets", color: "hsl(var(--chart-1))" },
  quizzes: { label: "Quizzes", color: "hsl(var(--chart-2))" },
  recommendations: { label: "Recommendations", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

export function AIUsageMonitor() {
  const [data, setData] = useState<AiUsageItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/admin/analytics?range=7d")
      .then((r) => r.json())
      .then((d: { aiUsageData?: AiUsageItem[] }) => setData(d.aiUsageData ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-slate-600" />
          AI usage
        </CardTitle>
        <CardDescription>Requests by type (last 7 days)</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">No AI usage data</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={data} margin={{ left: 12, right: 12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="worksheets" fill="var(--color-worksheets)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="quizzes" fill="var(--color-quizzes)" radius={[2, 2, 0, 0]} />
              <Bar dataKey="recommendations" fill="var(--color-recommendations)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
