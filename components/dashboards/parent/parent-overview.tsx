"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChildOverviewCard } from "./child-overview-card"
import { ParentProgressCharts } from "./parent-progress-charts"
import { ParentInsightsPanel } from "./parent-insights-panel"
import { RecentActivities, type ActivityItem } from "./recent-activities"
import { AchievementsMilestones } from "./achievements-milestones"
import { ReportDownloads } from "./report-downloads"
import { apiFetch } from "@/lib/api-client"
import type { Child, Subject, Progress, Assessment } from "@/lib/types"

interface ParentOverviewProps {
  children: Child[]
  subjects: Subject[]
}

type AnalyticsData = {
  summary: {
    averageScore: number
    worksheetsCompleted: number
    improvementPercent: number
    weeklyActivityCount: number
    streak?: number
  }
  progressData: Array<{ week: string; score: number }>
  subjectScores: Array<{ subject: string; score: number; fullMark: number }>
  weeklyActivity: Array<{ day: string; worksheets: number; quizzes: number }>
}

type InsightsData = {
  strengths: string[]
  weaknesses: string[]
  weekly_summary?: {
    mastered: string[]
    improving: string[]
    needs_attention: string[]
    try_this_activity?: string
    review_concept?: string
    celebrate?: string
    next_week_preview?: string
  }
  learning_style_summary?: string
}

export function ParentOverview({ children, subjects }: ParentOverviewProps) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(children[0]?.id ?? null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const selectedChild = children.find((c) => c.id === selectedChildId)

  useEffect(() => {
    if (!selectedChildId) {
      setAnalytics(null)
      setInsights(null)
      setActivities([])
      setLoading(false)
      return
    }
    setLoading(true)
    const abort = new AbortController()
    Promise.all([
      apiFetch("/api/analytics/parent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: selectedChildId }),
      }).then((r) => r.json()),
      apiFetch(`/api/parent/children/${selectedChildId}/insights`).then((r) =>
        r.ok ? r.json() : { insights: null },
      ),
      apiFetch(`/api/parent/children/${selectedChildId}/recent-activity`).then((r) =>
        r.ok ? r.json() : { activities: [] },
      ),
    ])
      .then(([analyticsRes, insightsRes, activityRes]) => {
        if (abort.signal.aborted) return
        setAnalytics(analyticsRes as AnalyticsData)
        setInsights((insightsRes as { insights?: InsightsData })?.insights ?? null)
        setActivities((activityRes as { activities?: ActivityItem[] })?.activities ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [selectedChildId])

  if (children.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-center">
        <p className="text-slate-600">Add a child to see the overview.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <label className="text-sm font-medium text-slate-700">Select child</label>
        <Select value={selectedChildId ?? ""} onValueChange={setSelectedChildId}>
          <SelectTrigger className="w-48 border-slate-200">
            <SelectValue placeholder="Choose child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedChild && (
        <>
          <ChildOverviewCard
            child={selectedChild}
            streak={analytics?.summary?.streak ?? 0}
            averageScore={analytics?.summary?.averageScore ?? 0}
            worksheetsCompleted={analytics?.summary?.worksheetsCompleted ?? 0}
          />

          <ParentProgressCharts
            progressData={analytics?.progressData ?? []}
            weeklyActivity={analytics?.weeklyActivity ?? []}
            subjectScores={analytics?.subjectScores ?? []}
            isLoading={loading}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <ParentInsightsPanel
              insights={insights}
              isLoading={loading}
              childName={selectedChild.name}
              summary={{
                streak: analytics?.summary?.streak,
                worksheetsCompleted: analytics?.summary?.worksheetsCompleted,
                averageScore: analytics?.summary?.averageScore,
              }}
            />
            <RecentActivities activities={activities} isLoading={loading} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AchievementsMilestones
              worksheetsCompleted={analytics?.summary?.worksheetsCompleted ?? 0}
              streak={analytics?.summary?.streak ?? 0}
              isLoading={loading}
            />
            <ReportDownloads
              child={selectedChild}
              progress={[]}
              assessments={[]}
              subjects={subjects}
              curriculumAgeGroup={selectedChild.age_group}
              insights={insights}
              summary={{
                streak: analytics?.summary?.streak,
                worksheetsCompleted: analytics?.summary?.worksheetsCompleted,
                averageScore: analytics?.summary?.averageScore,
              }}
              activities={activities}
            />
          </div>
        </>
      )}
    </div>
  )
}
