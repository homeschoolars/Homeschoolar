"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

const progressChartConfig = {
  week: { label: "Week" },
  score: { label: "Avg. score", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig

const activityChartConfig = {
  day: { label: "Day" },
  worksheets: { label: "Worksheets", color: "hsl(var(--chart-1))" },
  quizzes: { label: "Quizzes", color: "hsl(var(--chart-2))" },
  total: { label: "Total", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig

interface ParentProgressChartsProps {
  progressData: Array<{ week: string; score: number }>
  weeklyActivity: Array<{ day: string; worksheets: number; quizzes: number }>
  subjectScores: Array<{ subject: string; score: number; fullMark: number }>
  isLoading?: boolean
}

export function ParentProgressCharts({
  progressData,
  weeklyActivity,
  subjectScores,
  isLoading,
}: ParentProgressChartsProps) {
  const activityWithTotal = weeklyActivity.map((row) => ({
    ...row,
    total: row.worksheets + row.quizzes,
  }))

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[240px] w-full" />
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[240px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-900">Weekly & monthly progress</CardTitle>
            <CardDescription>Average scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={progressChartConfig} className="h-[240px] w-full">
              <LineChart data={progressData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-score)"
                  strokeWidth={2}
                  dot={{ fill: "var(--color-score)", r: 3 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-900">Time spent learning</CardTitle>
            <CardDescription>Worksheets and quizzes this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={activityChartConfig} className="h-[240px] w-full">
              <BarChart data={activityWithTotal} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="worksheets" fill="var(--color-worksheets)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quizzes" fill="var(--color-quizzes)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {subjectScores.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium text-slate-900">Subject performance</CardTitle>
            <CardDescription>Scores by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectScores} layout="vertical" margin={{ left: 80, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis type="category" dataKey="subject" width={72} tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
