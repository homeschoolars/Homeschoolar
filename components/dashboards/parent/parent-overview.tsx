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
  childProfiles: Child[]
  subjects: Subject[]
}

type AnalyticsData = {
  success?: boolean
  data?: {
    summary?: {
      averageScore: number
      worksheetsCompleted: number
      improvementPercent: number
      weeklyActivityCount: number
      streak?: number
    }
    progressData?: Array<{ week: string; score: number }>
    subjectScores?: Array<{ subject: string; score: number; fullMark: number }>
    weeklyActivity?: Array<{ day: string; worksheets: number; quizzes: number }>
  }
  summary?: {
    averageScore: number
    worksheetsCompleted: number
    improvementPercent: number
    weeklyActivityCount: number
    streak?: number
  }
  progressData?: Array<{ week: string; score: number }>
  subjectScores?: Array<{ subject: string; score: number; fullMark: number }>
  weeklyActivity?: Array<{ day: string; worksheets: number; quizzes: number }>
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

function normalizeInsightsPayload(payload: unknown): InsightsData | null {
  if (!payload || typeof payload !== "object") return null
  const source = payload as Record<string, unknown>
  const raw = source.insights
  if (!raw || typeof raw !== "object") return null

  const i = raw as Record<string, unknown>
  const readStringArray = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [])
  const weeklyRaw = (i.weekly_summary ?? {}) as Record<string, unknown>

  return {
    strengths: readStringArray(i.strengths),
    weaknesses: readStringArray(i.weaknesses),
    weekly_summary: {
      mastered: readStringArray(weeklyRaw.mastered),
      improving: readStringArray(weeklyRaw.improving),
      needs_attention: readStringArray(weeklyRaw.needs_attention),
      try_this_activity:
        typeof weeklyRaw.try_this_activity === "string" ? weeklyRaw.try_this_activity : undefined,
      review_concept: typeof weeklyRaw.review_concept === "string" ? weeklyRaw.review_concept : undefined,
      celebrate: typeof weeklyRaw.celebrate === "string" ? weeklyRaw.celebrate : undefined,
      next_week_preview: typeof weeklyRaw.next_week_preview === "string" ? weeklyRaw.next_week_preview : undefined,
    },
    learning_style_summary:
      typeof i.learning_style_summary === "string" ? i.learning_style_summary : undefined,
  }
}

export function ParentOverview({ childProfiles, subjects }: ParentOverviewProps) {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(childProfiles[0]?.id ?? null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const selectedChild = childProfiles.find((c) => c.id === selectedChildId)

  useEffect(() => {
    if (!selectedChildId) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        const normalizedAnalytics = analyticsRes as AnalyticsData
        setAnalytics(
          normalizedAnalytics.data
            ? {
                summary: normalizedAnalytics.data.summary ?? {
                  averageScore: 0,
                  worksheetsCompleted: 0,
                  improvementPercent: 0,
                  weeklyActivityCount: 0,
                },
                progressData: normalizedAnalytics.data.progressData ?? [],
                subjectScores: normalizedAnalytics.data.subjectScores ?? [],
                weeklyActivity: normalizedAnalytics.data.weeklyActivity ?? [],
              }
            : (normalizedAnalytics as AnalyticsData),
        )
        setInsights(normalizeInsightsPayload(insightsRes))
        setActivities((activityRes as { activities?: ActivityItem[] })?.activities ?? [])
      })
      .catch(() => {})
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false)
      })
    return () => abort.abort()
  }, [selectedChildId])

  if (childProfiles.length === 0) {
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
            {childProfiles.map((c) => (
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
