"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { SubjectScore } from "@/lib/assessment/types"

export type AIReportPayload = {
  learnerType: string
  interestProfile: string
  aptitudeProfile: string
  overallSummary: string
  strengthsNarrative: string
  growthNarrative: string
  personalityInsight: string
  careerPathways: string[]
  learningStyleTips: string[]
  subjectRecommendations: Array<{
    subject: string
    status: "strength" | "developing" | "needs-support"
    recommendation: string
  }>
  weeklyPlanSuggestion: string
  parentMessage: string
  islamicNote: string | null
}

export function AssessmentReportView({
  scores,
  report,
  onContinue,
  continueLabel,
  onRetake,
  retakeLabel,
}: {
  scores: Record<string, SubjectScore>
  report: AIReportPayload
  onContinue: () => void
  continueLabel?: string
  /** When set, shows a secondary control to start a new assessment attempt (new DB row on submit). */
  onRetake?: () => void
  retakeLabel?: string
}) {
  const entries = Object.entries(scores).sort((a, b) => b[1].pct - a[1].pct)
  const strong = entries.filter(([, s]) => s.pct >= 70)
  const weak = entries.filter(([, s]) => s.pct < 45)

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-violet-100 px-4 py-1.5 text-sm font-semibold text-violet-900">
          {report.learnerType}
        </span>
        <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-medium text-emerald-900">
          {report.interestProfile}
        </span>
        <span className="rounded-full bg-sky-100 px-4 py-1.5 text-sm font-medium text-sky-900">
          {report.aptitudeProfile}
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subject snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.map(([name, s]) => (
            <div key={name}>
              <div className="mb-1 flex justify-between text-sm capitalize">
                <span className="font-medium text-slate-800">{name}</span>
                <span className="text-slate-600">{Math.round(s.pct)}%</span>
              </div>
              <Progress value={Math.min(100, s.pct)} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardHeader>
            <CardTitle className="text-base text-emerald-900">Strong areas</CardTitle>
          </CardHeader>
          <CardContent>
            {strong.length ? (
              <ul className="list-inside list-disc text-sm text-emerald-900">
                {strong.map(([k]) => (
                  <li key={k} className="capitalize">
                    {k}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-emerald-800">Still mapping strengths — see narrative below.</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base text-amber-900">Growth opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            {weak.length ? (
              <ul className="list-inside list-disc text-sm text-amber-900">
                {weak.map(([k]) => (
                  <li key={k} className="capitalize">
                    {k}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-amber-900">Balanced profile — gentle stretch goals in the narrative.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your personalised report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-slate-700">
          <p>{report.overallSummary}</p>
          <div>
            <h3 className="font-semibold text-slate-900">Strengths</h3>
            <p className="mt-1">{report.strengthsNarrative}</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Room to grow</h3>
            <p className="mt-1">{report.growthNarrative}</p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Learning personality</h3>
            <p className="mt-1">{report.personalityInsight}</p>
          </div>
          {report.islamicNote ? (
            <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2">
              <h3 className="font-semibold text-violet-900">Islamic studies</h3>
              <p className="mt-1 text-violet-900">{report.islamicNote}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Career & interest directions</h3>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
              {report.careerPathways.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">How they learn best</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {report.learningStyleTips.map((t, i) => (
                <li key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">By subject</h3>
            <ul className="mt-2 space-y-3">
              {report.subjectRecommendations.map((r, i) => (
                <li key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <span className="font-medium text-slate-900">{r.subject}</span>
                  <span className="ml-2 text-xs uppercase text-slate-500">({r.status})</span>
                  <p className="mt-1 text-slate-700">{r.recommendation}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Suggested weekly rhythm</h3>
            <p className="mt-2 text-sm text-slate-700">{report.weeklyPlanSuggestion}</p>
          </div>
          <div className="rounded-xl bg-violet-50 p-4 text-sm text-violet-950">
            <p className="font-medium">For you</p>
            <p className="mt-2">{report.parentMessage}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {onRetake ? (
          <Button type="button" variant="outline" size="lg" className="sm:order-1 sm:flex-1" onClick={onRetake}>
            {retakeLabel ?? "Retake assessment"}
          </Button>
        ) : null}
        <Button
          type="button"
          className="bg-violet-600 hover:bg-violet-700 sm:order-2 sm:min-w-[200px]"
          size="lg"
          onClick={onContinue}
        >
          {continueLabel ?? "Back to dashboard"}
        </Button>
      </div>
    </div>
  )
}
