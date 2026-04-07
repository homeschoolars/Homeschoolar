"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AssessmentSetup, type ChildOption } from "@/components/assessment/AssessmentSetup"
import { AssessmentProgressBar } from "@/components/assessment/ProgressBar"
import { QuizQuestion } from "@/components/assessment/QuizQuestion"
import type { AIReportPayload } from "@/components/assessment/AssessmentReport"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { buildQuestionList } from "@/lib/assessment/question-bank"
import { questionsForPrompt } from "@/lib/assessment/prompts"
import { computeScores, extractOpenAnswers } from "@/lib/assessment/scoring"
import type { AnswerValue, BankQuestion } from "@/lib/assessment/types"
import { apiFetch } from "@/lib/api-client"
import { ParentAppHeader } from "@/components/layout/parent-app-header"
import { Loader2 } from "lucide-react"

type Phase = "setup" | "quiz" | "loading"

export function AssessmentFlow({
  routeChildId,
  routeChildName,
  routeChildLearningClassLabel,
  initialChildren,
  isRetake,
  requiresPasswordBeforeQuiz,
}: {
  routeChildId: string
  routeChildName: string
  routeChildLearningClassLabel: string
  initialChildren: ChildOption[]
  isRetake: boolean
  requiresPasswordBeforeQuiz: boolean
}) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>("setup")
  const [age, setAge] = useState(() => {
    const c = initialChildren.find((x) => x.id === routeChildId)
    return c?.ageYears != null ? Math.min(13, Math.max(4, c.ageYears)) : 8
  })
  const [includeIslamic, setIncludeIslamic] = useState(false)
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({})
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [passwordVerified, setPasswordVerified] = useState(!requiresPasswordBeforeQuiz)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [parentPassword, setParentPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [verifyingPassword, setVerifyingPassword] = useState(false)

  useEffect(() => {
    const c = initialChildren.find((x) => x.id === routeChildId)
    if (c?.ageYears != null) {
      setAge(Math.min(13, Math.max(4, c.ageYears)))
    }
  }, [routeChildId, initialChildren])

  useEffect(() => {
    setPasswordVerified(!requiresPasswordBeforeQuiz)
    setPasswordModalOpen(false)
    setParentPassword("")
    setPasswordError(null)
  }, [routeChildId, requiresPasswordBeforeQuiz])

  const parentMode = age <= 5

  const youngBandLabel = requiresPasswordBeforeQuiz ? routeChildLearningClassLabel : null

  const navigateToChild = useCallback(
    (id: string) => {
      if (id === routeChildId) return
      router.push(`/assessment/${id}`)
    },
    [router, routeChildId],
  )

  const startQuiz = useCallback(() => {
    setQuestions(buildQuestionList(age, includeIslamic))
    setQIndex(0)
    setAnswers({})
    setFieldError(null)
    setPhase("quiz")
  }, [age, includeIslamic])

  const handleClickStart = useCallback(() => {
    if (requiresPasswordBeforeQuiz && !passwordVerified) {
      setParentPassword("")
      setPasswordError(null)
      setPasswordModalOpen(true)
      return
    }
    startQuiz()
  }, [requiresPasswordBeforeQuiz, passwordVerified, startQuiz])

  const verifyAndStart = async () => {
    setPasswordError(null)
    setVerifyingPassword(true)
    try {
      const res = await apiFetch("/api/parent/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: parentPassword }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setPasswordError(data.error ?? "Could not verify password")
        return
      }
      setPasswordVerified(true)
      setPasswordModalOpen(false)
      setParentPassword("")
      startQuiz()
    } finally {
      setVerifyingPassword(false)
    }
  }

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

  const submitReport = useCallback(async () => {
    const sc = computeScores(questions, answers)
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
          childId: routeChildId,
          age,
          scores: sc,
          openAnswers,
          retake: isRetake,
          questionMetas: questionsForPrompt(questions),
        }),
      })
      const payload = (await res.json()) as { report?: AIReportPayload; error?: string }
      if (!res.ok || !payload.report) {
        throw new Error(payload.error ?? "Report failed")
      }
      const q = new URLSearchParams({
        assessmentComplete: "1",
        learnerType: payload.report.learnerType,
        childId: routeChildId,
      })
      router.push(`/parent?${q.toString()}`)
      router.refresh()
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to generate report")
      setPhase("quiz")
    }
  }, [age, answers, isRetake, questions, routeChildId, router])

  const next = useCallback(() => {
    if (!validateCurrent()) return
    if (qIndex >= questions.length - 1) {
      void submitReport()
      return
    }
    setQIndex((i) => i + 1)
    setFieldError(null)
  }, [qIndex, questions.length, submitReport, validateCurrent])

  const currentQ = questions[qIndex]

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/80 to-white">
      <ParentAppHeader active="dashboard" />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm parent password</DialogTitle>
              <DialogDescription>
                For {youngBandLabel ?? "this age band"}, enter the password you use to sign in to your parent account.
                Then the assessment quiz will begin. The written report is only shown on your parent dashboard.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label htmlFor="parent-pw">Parent password</Label>
              <Input
                id="parent-pw"
                type="password"
                autoComplete="current-password"
                value={parentPassword}
                onChange={(e) => setParentPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void verifyAndStart()
                }}
              />
              {passwordError ? <p className="text-sm text-red-600">{passwordError}</p> : null}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" type="button" onClick={() => setPasswordModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-violet-600 hover:bg-violet-700"
                disabled={verifyingPassword || !parentPassword.trim()}
                onClick={() => void verifyAndStart()}
              >
                {verifyingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  "Continue to quiz"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {phase === "setup" ? (
          <AssessmentSetup
            childrenList={initialChildren}
            childId={routeChildId}
            onChildId={navigateToChild}
            age={age}
            onAge={(n) => setAge(Math.min(13, Math.max(4, n)))}
            includeIslamic={includeIslamic}
            onIncludeIslamic={setIncludeIslamic}
            onStart={handleClickStart}
            disabled={!routeChildId}
            startHint={
              requiresPasswordBeforeQuiz
                ? `${youngBandLabel ? `${youngBandLabel}: ` : ""}When you tap Start, you’ll enter your parent password, then the quiz opens. The full report goes to your dashboard — students don’t see it.`
                : "The full report goes to your parent dashboard after you finish — students don’t see it."
            }
            assessedChildName={routeChildName}
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
                {qIndex >= questions.length - 1 ? "Finish & save report" : "Next"}
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-10 w-10 animate-spin text-violet-600" />
            <p className="text-sm font-medium text-slate-700">Saving report to your dashboard…</p>
            <p className="text-xs text-slate-500 text-center max-w-sm">
              You’ll be redirected to the parent dashboard. {routeChildName}&apos;s detailed report and PDF download are
              there — not on the student account.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
