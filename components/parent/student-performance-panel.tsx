"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

type PerformancePayload = {
  worksheets: Array<{
    id: string
    title: string
    percentage: number | null
    feedback: string | null
    weak_topics: string[]
    created_at: string
  }>
  quizzes: Array<{
    id: string
    title: string
    score: string
    percentage: number
    submitted_at: string
  }>
  weak_topics: string[]
  topic_analytics: Array<{
    topic_id: string
    avg_score: number
    attempts: number
    weak_flag: boolean
  }>
  progress_summary: {
    average_percentage: number
    total_worksheet_attempts: number
    total_submissions: number
    topics_tracked: number
  }
}

export function StudentPerformancePanel({ studentId }: { studentId: string }) {
  const [data, setData] = useState<PerformancePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/parent/student-performance?student_id=${encodeURIComponent(studentId)}`)
        const json = (await res.json()) as { success?: boolean; data?: PerformancePayload; error?: string }
        if (!res.ok || !json.success || !json.data) {
          throw new Error(json.error ?? "Could not load performance")
        }
        if (!cancelled) setData(json.data)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [studentId])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex justify-center text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="py-6 text-sm text-red-700">{error}</CardContent>
      </Card>
    )
  }

  if (!data) return null

  const avg = data.progress_summary.average_percentage

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Learning progress</CardTitle>
          <CardDescription>Roll-up across worksheets and quizzes (tracked per topic).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-sm font-medium text-slate-700 mb-1">
              <span>Average score</span>
              <span>{avg}%</span>
            </div>
            <Progress value={Math.min(100, avg)} className="h-2" />
          </div>
          <p className="text-xs text-slate-600">
            Worksheet attempts: {data.progress_summary.total_worksheet_attempts} · Graded submissions:{" "}
            {data.progress_summary.total_submissions} · Topics tracked: {data.progress_summary.topics_tracked}
          </p>
        </CardContent>
      </Card>

      {data.weak_topics.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">Areas to reinforce</CardTitle>
            <CardDescription>From analytics and profile weak areas.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm text-slate-800 space-y-1">
              {data.weak_topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent worksheets (AI-graded)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.worksheets.length === 0 ? (
            <p className="text-sm text-slate-500">No graded worksheet records yet.</p>
          ) : (
            data.worksheets.slice(0, 8).map((w) => (
              <div key={w.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <p className="font-semibold text-slate-900">{w.title}</p>
                <p className="text-violet-700 font-medium">{w.percentage != null ? `${w.percentage}%` : "—"}</p>
                {w.feedback ? <p className="mt-1 text-slate-600 line-clamp-3">{w.feedback}</p> : null}
                {w.weak_topics.length > 0 ? (
                  <p className="mt-1 text-xs text-amber-800">Focus: {w.weak_topics.join(", ")}</p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent quiz-style submissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.quizzes.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions yet.</p>
          ) : (
            data.quizzes.slice(0, 8).map((q) => (
              <div key={q.id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                <span className="text-slate-800 font-medium truncate pr-2">{q.title}</span>
                <span className="shrink-0 text-violet-700">
                  {q.score} ({q.percentage}%)
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
