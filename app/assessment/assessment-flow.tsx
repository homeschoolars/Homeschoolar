"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AssessmentSetup, type ChildOption } from "@/components/assessment/AssessmentSetup"
import { AssessmentProgressBar } from "@/components/assessment/ProgressBar"
import { QuizQuestion } from "@/components/assessment/QuizQuestion"
import { AssessmentReportView, type AIReportPayload } from "@/components/assessment/AssessmentReport"
import { Button } from "@/components/ui/button"
import { buildQuestionList } from "@/lib/assessment/question-bank"
import { questionsForPrompt } from "@/lib/assessment/prompts"
import { computeScores, extractOpenAnswers } from "@/lib/assessment/scoring"
import type { AnswerValue, BankQuestion } from "@/lib/assessment/types"
import { apiFetch } from "@/lib/api-client"
import { ParentAppHeader } from "@/components/layout/parent-app-header"
import { Loader2 } from "lucide-react"

type Phase = "setup" | "quiz" | "loading" | "report"

export function AssessmentFlow({ initialChildren }: { initialChildren: ChildOption[] }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("setup")
  const [childId, setChildId] = useState(() => initialChildren[0]?.id ?? "")
  const [age, setAge] = useState(() => {
    const c = initialChildren[0]
    return c?.ageYears != null ? Math.min(13, Math.max(4, c.ageYears)) : 8
  })
  const [includeIslamic, setIncludeIslamic] = useState(false)
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({})
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, { pct: number; total: number; max: number }>>({})
  const [report, setReport] = useState<AIReportPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const childName = useMemo(() => initialChildren.find((c) => c.id === childId)?.name ?? "", [childId, initialChildren])

  useEffect(() => {
    const c = initialChildren.find((x) => x.id === childId)
    if (c?.ageYears != null) {
      setAge(Math.min(13, Math.max(4, c.ageYears)))
    }
  }, [childId, initialChildren])

  const parentMode = age <= 5

  const startQuiz = useCallback(() => {
    setQuestions(buildQuestionList(age, includeIslamic))
    setQIndex(0)
    setAnswers({})
    setFieldError(null)
    setPhase("quiz")
  }, [age, includeIslamic])

  const validateCurrent = useCallback((): boolean => {
    const q = questions[qIndex]
    if (!q) return false
    const a = answers[qIndex]
    setFieldError(null)
    if (!a) {
      setFieldError("Please answer before continuing.")
      return false
    }
    if (q.type === "open" && a.type === "open") {
      const min = q.minLength ?? 20
      if (a.text.trim().length < min) {
        setFieldError(`Please write at least ${min} characters.`)
        return false
      }
    }
    return true
  }, [answers, qIndex, questions])

  const next = useCallback(() => {
    if (!validateCurrent()) return
    if (qIndex >= questions.length - 1) {
      void submitReport()
      return
    }
    setQIndex((i) => i + 1)
    setFieldError(null)
  }, [qIndex, questions.length, validateCurrent])

  const submitReport = async () => {
    const sc = computeScores(questions, answers)
    setScores(sc)
    setPhase("loading")
    setLoadError(null)
    const openRaw = extractOpenAnswers(questions, answers)
    const openAnswers: Record<string, string> = {}
    Object.entries(openRaw).forEach(([k, v]) => {
      openAnswers[k] = v
    })

    try {
      const res = await apiFetch("/api/assessment/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          age,
          scores: sc,
          openAnswers,
          questionMetas: questionsForPrompt(questions),
        }),
      })
      const payload = (await res.json()) as { report?: AIReportPayload; error?: string }
      if (!res.ok || !payload.report) {
        throw new Error(payload.error ?? "Report failed")
      }
      setReport(payload.report)
      setPhase("report")
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to generate report")
      setPhase("quiz")
    }
  }

  const goDashboard = useCallback(() => {
    if (!report) return
    const q = new URLSearchParams({
      assessmentComplete: "1",
      learnerType: report.learnerType,
    })
    router.push(`/parent/dashboard?${q.toString()}`)
  }, [report, router])

  const currentQ = questions[qIndex]

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/80 to-white">
      <ParentAppHeader active="dashboard" />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {phase === "setup" ? (
          <AssessmentSetup
            childrenList={initialChildren}
            childId={childId}
            onChildId={setChildId}
            age={age}
            onAge={(n) => setAge(Math.min(13, Math.max(4, n)))}
            includeIslamic={includeIslamic}
            onIncludeIslamic={setIncludeIslamic}
            onStart={startQuiz}
            disabled={!childId}
          />
        ) : null}

        {phase === "quiz" && currentQ ? (
          <div className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <AssessmentProgressBar current={qIndex} total={questions.length} />
            <QuizQuestion
              question={currentQ}
              value={answers[qIndex]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [qIndex]: v }))}
              parentMode={parentMode}
              error={fieldError}
            />
            {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setPhase("setup")}>
                Exit
              </Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700" type="button" onClick={next}>
                {qIndex >= questions.length - 1 ? "Finish & generate report" : "Next"}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
            <p className="text-sm font-medium text-slate-700">Building your personalised report…</p>
          </div>
        ) : null}

        {phase === "report" && report ? (
          <AssessmentReportView scores={scores} report={report} onContinue={goDashboard} continueLabel="Go to parent dashboard" />
        ) : null}
      </div>
    </div>
  )
}
