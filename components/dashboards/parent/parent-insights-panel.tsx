"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Sparkles, ThumbsUp, AlertCircle, FileDown } from "lucide-react"
import { InsightsPDFActions } from "@/components/pdf/pdf-actions"

interface WeeklySummary {
  mastered: string[]
  improving: string[]
  needs_attention: string[]
  try_this_activity?: string
  review_concept?: string
  celebrate?: string
  next_week_preview?: string
}

interface InsightsData {
  strengths: string[]
  weaknesses: string[]
  weekly_summary?: WeeklySummary
  learning_style_summary?: string
}

interface ParentInsightsPanelProps {
  insights: InsightsData | null
  isLoading?: boolean
  childName: string
  summary?: { streak?: number; worksheetsCompleted?: number; averageScore?: number }
}

export function ParentInsightsPanel({
  insights,
  isLoading,
  childName,
  summary,
}: ParentInsightsPanelProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  const ws = insights?.weekly_summary
  const improving = ws?.improving ?? insights?.strengths ?? []
  const needsHelp = ws?.needs_attention ?? insights?.weaknesses ?? []
  const celebrate = ws?.celebrate
  const tryActivity = ws?.try_this_activity
  const review = ws?.review_concept
  const hasTakeaways = !!(celebrate || tryActivity || review)

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-600" />
          AI insights
        </CardTitle>
        <CardDescription>Personalized updates and actionable takeaways for {childName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Key takeaways — insight-focused, first */}
        {hasTakeaways && (
          <div className="rounded-xl border-2 border-teal-200 bg-teal-50/60 p-4 space-y-3">
            <p className="text-sm font-semibold text-teal-800 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Key takeaways
            </p>
            {celebrate && (
              <div className="rounded-lg bg-green-50 border border-green-100 p-3">
                <p className="text-xs font-semibold text-green-800 mb-1">Celebrate</p>
                <p className="text-sm text-green-800">{celebrate}</p>
              </div>
            )}
            {tryActivity && (
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">Try at home</p>
                <p className="text-sm text-amber-800">{tryActivity}</p>
              </div>
            )}
            {review && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs font-semibold text-blue-800 mb-1">Review</p>
                <p className="text-sm text-blue-800">{review}</p>
              </div>
            )}
          </div>
        )}

        {improving.length > 0 && (
          <div className="rounded-lg bg-teal-50 border border-teal-100 p-4">
            <p className="text-sm font-medium text-teal-800 flex items-center gap-2 mb-2">
              <ThumbsUp className="h-4 w-4" />
              Your child is improving in
            </p>
            <ul className="text-sm text-teal-700 list-disc list-inside space-y-0.5">
              {improving.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {needsHelp.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-4">
            <p className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4" />
              Needs attention
            </p>
            <ul className="text-sm text-amber-700 list-disc list-inside space-y-0.5">
              {needsHelp.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Export CTA */}
        <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileDown className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-sm font-medium text-slate-700">Export insights report</p>
              <p className="text-xs text-slate-500">PDF with key takeaways, strengths, and next steps</p>
            </div>
          </div>
          <InsightsPDFActions
            childName={childName}
            insights={insights}
            summary={summary}
          />
        </div>

        {!insights && !isLoading && (
          <p className="text-sm text-slate-500 italic">
            Complete an assessment and some activities to see AI insights for {childName}.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
