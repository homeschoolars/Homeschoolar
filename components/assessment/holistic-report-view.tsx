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
import type { AssessmentReportPublic } from "@/lib/assessment/types-ai"
import { Sparkles, Heart, Brain } from "lucide-react"

function barColor(score: number) {
  if (score >= 70) return "#22c55e"
  if (score >= 45) return "#f59e0b"
  return "#ef4444"
}

type Props = {
  childId: string
  childName: string
  age: number
  report: AssessmentReportPublic
}

export function HolisticReportView({ childId, childName, age, report }: Props) {
  const chartData = report.subjectScores.map((s) => ({
    name: s.label || s.subject,
    score: s.score,
    fill: barColor(s.score),
  }))

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="outline" asChild className="rounded-xl border-[#ede8ff]">
          <Link href="/parent">← Parent dashboard</Link>
        </Button>
        <Button asChild className="rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9]">
          <a href={`/api/assessment/report/${childId}/pdf`} target="_blank" rel="noopener noreferrer">
            Download full report (PDF)
          </a>
        </Button>
      </div>

      <Card className="overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-[#7F77DD] to-[#5b52c4] text-white shadow-xl">
        <CardContent className="p-8 sm:p-10">
          <p className="text-sm font-medium text-white/80">Holistic learning profile</p>
          <h1 className="mt-2 text-3xl font-bold font-[family-name:var(--font-heading)]">{childName}</h1>
          <p className="mt-1 text-white/90">Age {age}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Learner type</p>
              <p className="text-lg font-semibold">{report.learningProfile.learnerType}</p>
            </div>
            <div className="rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-white/70">Interest profile</p>
              <p className="text-lg font-semibold">{report.interestProfile.primary}</p>
              <p className="text-sm text-white/80">{report.interestProfile.secondary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Brain className="h-5 w-5 text-[#7F77DD]" />
            <CardTitle className="text-lg">Thinking & reasoning snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-slate-900">{report.iqEstimate.score}</p>
            <p className="text-sm font-medium text-[#7F77DD]">{report.iqEstimate.category}</p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{report.iqEstimate.explanation}</p>
            <p className="mt-3 text-xs text-slate-500">
              Informal estimate from quiz-style questions — not a clinical IQ test.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Heart className="h-5 w-5 text-rose-500" />
            <CardTitle className="text-lg">Social & emotional snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-slate-900">{report.eqEstimate.score}</p>
            <p className="text-sm font-medium text-rose-600">{report.eqEstimate.category}</p>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{report.eqEstimate.explanation}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-amber-100 bg-amber-50/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-amber-950">Wellbeing & engagement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-amber-950/90">
          <p className="font-semibold">{report.mentalHealthSnapshot.overall}</p>
          <p className="text-sm leading-relaxed">{report.mentalHealthSnapshot.note}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Subject snapshot</CardTitle>
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

      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="rounded-2xl border-green-200 bg-green-50/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-green-900">Strong subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-green-900/90">
              {report.strongSubjects.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-red-200 bg-red-50/40 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-red-900">Growth opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-red-900/90">
              {report.weakSubjects.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Learning style & pace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-medium text-slate-900">Style:</span> {report.learningProfile.preferredStyle}
          </p>
          <p>
            <span className="font-medium text-slate-900">Pace:</span> {report.learningProfile.paceType.replace(/_/g, " ")}
          </p>
          <p className="leading-relaxed">{report.learningProfile.narrative}</p>
          <p className="text-slate-600">{report.interestProfile.narrative}</p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#ede8ff] shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#7F77DD]" />
          <CardTitle className="text-lg">Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.recommendations.map((r, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-[#ede8ff] bg-[#faf8ff] p-4">
              <span className="text-2xl" aria-hidden>
                {r.icon}
              </span>
              <div>
                <p className="font-semibold text-slate-900">{r.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{r.detail}</p>
                <p className="mt-1 text-xs text-[#7F77DD]">{r.linkedSubject}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-[#ede8ff] bg-[#EEEDFE]/50 shadow-sm">
        <CardContent className="p-8">
          <p className="text-sm font-medium text-[#5a5499]">A note for you</p>
          <p className="mt-3 text-base leading-relaxed text-slate-800">{report.parentMessage}</p>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-slate-500">{report.overallSummary}</p>
    </div>
  )
}
