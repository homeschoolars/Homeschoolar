"use client"

import Link from "next/link"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DownloadButton } from "@/components/pdf/download-button"
import { FileText } from "lucide-react"

function barColor(score: number) {
  if (score >= 70) return "#22c55e"
  if (score >= 45) return "#f59e0b"
  return "#ef4444"
}

type SubjectRec = { subject: string; status: string; recommendation: string }

type Props = {
  childId: string
  childName: string
  age: number
  completedAtIso: string
  scores: Record<string, { pct?: number; total?: number; max?: number }>
  report: Record<string, unknown>
}

export function ParentQuestionnaireReportView({
  childId,
  childName,
  age,
  completedAtIso,
  scores,
  report,
}: Props) {
  const chartData = Object.entries(scores ?? {}).map(([name, v]) => ({
    name,
    score: typeof v?.pct === "number" ? Math.round(v.pct) : 0,
    fill: barColor(typeof v?.pct === "number" ? v.pct : 0),
  }))

  const str = (k: string) => (typeof report[k] === "string" ? (report[k] as string) : "")
  const strArr = (k: string): string[] =>
    Array.isArray(report[k]) ? (report[k] as unknown[]).filter((x): x is string => typeof x === "string") : []
  const subjectRecs: SubjectRec[] = Array.isArray(report.subjectRecommendations)
    ? (report.subjectRecommendations as SubjectRec[]).filter(
        (x) => x && typeof x.subject === "string" && typeof x.recommendation === "string",
      )
    : []

  const completedLabel = new Date(completedAtIso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" asChild className="rounded-xl border-[#ede8ff]">
          <Link href="/parent">← Parent dashboard</Link>
        </Button>
        <DownloadButton
          pdfType="holistic-learning-assessment"
          data={{ childId }}
          fileName={`${childName.replace(/\s+/g, "-").toLowerCase()}-learning-assessment.pdf`}
          variant="default"
          className="rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9] text-white border-0"
        >
          <FileText className="w-4 h-4 mr-2" />
          Download report (PDF)
        </DownloadButton>
      </div>

      <Card className="overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-[#7F77DD] to-[#5b52c4] text-white shadow-xl">
        <CardContent className="p-8 sm:p-10">
          <p className="text-sm font-medium text-white/80">Learning assessment report</p>
          <h1 className="mt-2 text-3xl font-bold">{childName}</h1>
          <p className="mt-1 text-white/90">
            Age {age} · Completed {completedLabel}
          </p>
        </CardContent>
      </Card>

      {(str("learnerType") || str("interestProfile") || str("aptitudeProfile")) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {str("learnerType") ? (
            <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Learner type</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">{str("learnerType")}</p>
              </CardContent>
            </Card>
          ) : null}
          {str("interestProfile") ? (
            <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Interests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">{str("interestProfile")}</p>
              </CardContent>
            </Card>
          ) : null}
          {str("aptitudeProfile") ? (
            <Card className="rounded-2xl border-[#ede8ff] shadow-sm sm:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Aptitude snapshot</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed">{str("aptitudeProfile")}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {chartData.length > 0 && (
        <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Subject scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {str("overallSummary") ? (
        <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Overall summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{str("overallSummary")}</p>
          </CardContent>
        </Card>
      ) : null}

      {(str("strengthsNarrative") || str("growthNarrative") || str("personalityInsight")) && (
        <div className="grid gap-4 sm:grid-cols-1">
          {str("strengthsNarrative") ? (
            <Card className="rounded-2xl border-green-200 bg-green-50/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-green-900">Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-900/90 leading-relaxed whitespace-pre-wrap">
                  {str("strengthsNarrative")}
                </p>
              </CardContent>
            </Card>
          ) : null}
          {str("growthNarrative") ? (
            <Card className="rounded-2xl border-amber-200 bg-amber-50/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-amber-950">Growth areas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-amber-950/90 leading-relaxed whitespace-pre-wrap">
                  {str("growthNarrative")}
                </p>
              </CardContent>
            </Card>
          ) : null}
          {str("personalityInsight") ? (
            <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Personality & learning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{str("personalityInsight")}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {strArr("learningStyleTips").length > 0 && (
        <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Learning style tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
              {strArr("learningStyleTips").map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {strArr("careerPathways").length > 0 && (
        <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Career pathways (exploratory)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
              {strArr("careerPathways").map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {subjectRecs.length > 0 && (
        <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Subject recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectRecs.map((row, i) => (
              <div key={i} className="rounded-xl border border-[#ede8ff] bg-[#faf8ff] p-4">
                <p className="font-semibold text-slate-900">{row.subject}</p>
                <p className="text-xs uppercase tracking-wide text-[#7F77DD] mt-1">{row.status}</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{row.recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(str("weeklyPlanSuggestion") || str("parentMessage")) && (
        <div className="space-y-4">
          {str("weeklyPlanSuggestion") ? (
            <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Weekly plan suggestion</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{str("weeklyPlanSuggestion")}</p>
              </CardContent>
            </Card>
          ) : null}
          {str("parentMessage") ? (
            <Card className="rounded-2xl border-[#ede8ff] bg-[#EEEDFE]/50 shadow-sm">
              <CardContent className="p-8">
                <p className="text-sm font-medium text-[#5a5499]">A note for you</p>
                <p className="mt-3 text-base leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {str("parentMessage")}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {str("islamicNote") ? (
        <Card className="rounded-2xl border-emerald-200 bg-emerald-50/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-emerald-900">Islamic lens</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-900/90 leading-relaxed whitespace-pre-wrap">{str("islamicNote")}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
