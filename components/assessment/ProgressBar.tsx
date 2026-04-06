"use client"

import { Progress } from "@/components/ui/progress"

export function AssessmentProgressBar({ current, total }: { current: number; total: number }) {
  const n = Math.max(1, total)
  const pct = Math.min(100, Math.round(((current + 1) / n) * 100))
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium text-slate-600">
        <span>
          Question {current + 1} of {total}
        </span>
        <span>{pct}%</span>
      </div>
      <Progress value={pct} className="h-2.5" />
    </div>
  )
}
