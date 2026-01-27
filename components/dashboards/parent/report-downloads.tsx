"use client"

import { useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, FileSpreadsheet, Sparkles } from "lucide-react"
import type { Child, Subject, Progress, Assessment } from "@/lib/types"
import { AssessmentPDFActions, CurriculumPDFActions, InsightsPDFActions } from "@/components/pdf/pdf-actions"
import type { ActivityItem } from "./recent-activities"

export type InsightsForReport = {
  strengths?: string[]
  weaknesses?: string[]
  weekly_summary?: {
    mastered?: string[]
    improving?: string[]
    needs_attention?: string[]
    try_this_activity?: string
    review_concept?: string
    celebrate?: string
    next_week_preview?: string
  }
}

interface ReportDownloadsProps {
  child: Child
  progress: Progress[]
  assessments: Assessment[]
  subjects: Subject[]
  curriculumAgeGroup: string
  insights?: InsightsForReport | null
  summary?: { streak?: number; worksheetsCompleted?: number; averageScore?: number }
  activities?: ActivityItem[]
}

function escapeCsv(s: string): string {
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function ReportDownloads({
  child,
  progress,
  assessments,
  subjects,
  curriculumAgeGroup,
  insights,
  summary,
  activities = [],
}: ReportDownloadsProps) {
  const exportActivityCsv = useCallback(() => {
    const headers = ["Date", "Type", "Title", "Subject", "Score", "Max Score"]
    const rows = activities.map((a) => [
      a.date,
      a.type,
      escapeCsv(a.title),
      escapeCsv(a.subject),
      a.score ?? "",
      a.maxScore ?? "",
    ])
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${child.name.replace(/\s+/g, "-").toLowerCase()}-activity-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [activities, child.name])

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
          <FileDown className="h-4 w-4 text-slate-600" />
          Exportable reports
        </CardTitle>
        <CardDescription>Insight-focused PDFs and CSV. Download or share via email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Primary: Insights Report */}
        <div className="rounded-lg border-2 border-teal-200 bg-teal-50/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-semibold text-teal-800">Insights report</span>
          </div>
          <p className="text-xs text-teal-700 mb-3">
            AI-powered summary: strengths, needs attention, key takeaways, try at home, and next steps.
          </p>
          <InsightsPDFActions
            childName={child.name}
            insights={insights ?? null}
            summary={summary}
          />
        </div>

        {/* Secondary: Assessment & Curriculum */}
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">Other reports</p>
          <div className="flex flex-wrap gap-3">
            <AssessmentPDFActions
              child={child}
              progress={progress}
              assessments={assessments}
              subjects={subjects}
            />
            <CurriculumPDFActions
              subjects={subjects}
              ageGroup={curriculumAgeGroup}
              childName={child.name}
            />
          </div>
        </div>

        {/* CSV: Activity export */}
        {activities.length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <FileSpreadsheet className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">Export activity (CSV)</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Recent worksheets and quizzes — open in Excel or Google Sheets.
            </p>
            <Button variant="outline" size="sm" onClick={exportActivityCsv} className="border-slate-300">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
