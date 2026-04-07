"use client"

import { useCallback, useEffect, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { LearningBrandHeader } from "@/components/learning/learning-brand-header"
import { cn } from "@/lib/utils"

export type AdaptiveQuizQuestion = {
  question: string
  options: string[]
  correctAnswer: string
  explanation?: string
}

export function AdaptiveQuizPlayer(props: {
  lessonId: string
  childId: string
  questions: AdaptiveQuizQuestion[]
  onSubmitted?: () => void
  /** Countdown in seconds; when time hits zero the current score is submitted automatically. */
  timeLimitSeconds?: number
}) {
  const { lessonId, childId, questions, onSubmitted, timeLimitSeconds = 300 } = props
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedOk, setSubmittedOk] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    setSecondsLeft(timeLimitSeconds)
    setTimedOut(false)
  }, [lessonId, timeLimitSeconds])

  useEffect(() => {
    if (done || submittedOk || timeLimitSeconds <= 0) return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [done, submittedOk, timeLimitSeconds])

  useEffect(() => {
    if (timeLimitSeconds <= 0) return
    if (secondsLeft > 0 || done || submittedOk) return
    setTimedOut(true)
    setDone(true)
  }, [secondsLeft, done, submittedOk, timeLimitSeconds])

  const q = questions[idx]

  const pickOption = (opt: string) => {
    if (revealed) return
    setPicked(opt)
    setRevealed(true)
  }

  const advance = () => {
    if (!picked || !revealed || !q) return
    const ok = picked === q.correctAnswer
    setCorrectCount((c) => c + (ok ? 1 : 0))
    if (idx >= questions.length - 1) {
      setDone(true)
      return
    }
    setIdx((i) => i + 1)
    setPicked(null)
    setRevealed(false)
  }

  const submitProgress = useCallback(async () => {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await apiFetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId,
          lessonId,
          score: correctCount,
          maxScore: questions.length,
        }),
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || payload.success !== true) {
        throw new Error(payload.error ?? "Could not save quiz")
      }
      setSubmittedOk(true)
      onSubmitted?.()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Submit failed")
    } finally {
      setSubmitting(false)
    }
  }, [childId, lessonId, correctCount, questions.length, onSubmitted])

  useEffect(() => {
    if (!timedOut || submittedOk || submitting) return
    void submitProgress()
  }, [timedOut, submittedOk, submitting, submitProgress])

  if (!q) return null

  if (done) {
    return (
      <div className="space-y-4 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
        <LearningBrandHeader />
        <div className="rounded-xl bg-violet-50 p-4 text-center">
          <p className="text-sm font-medium text-violet-900">Quiz complete</p>
          <p className="mt-2 text-3xl font-bold text-violet-800">
            {correctCount} / {questions.length}
          </p>
          <p className="text-sm text-slate-600">Great effort — keep learning!</p>
        </div>
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        {submittedOk ? (
          <p className="text-center text-sm font-medium text-green-700">Saved to your progress.</p>
        ) : timedOut ? (
          <p className="text-center text-sm text-slate-600">{submitting ? "Saving your quiz…" : submitError ?? "Saving…"}</p>
        ) : (
          <Button className="w-full bg-[#7F77DD] hover:bg-[#6C63D5]" onClick={() => void submitProgress()} disabled={submitting}>
            {submitting ? "Saving…" : "Save score to progress"}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm">
      <LearningBrandHeader />
      {timeLimitSeconds > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
          <span>
            Time left:{" "}
            <span className="tabular-nums text-violet-800">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
            </span>
          </span>
          <span className="text-slate-500">Auto-submit at 0:00</span>
        </div>
      ) : null}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium text-slate-600">
          <span>
            Question {idx + 1} of {questions.length}
          </span>
        </div>
        <Progress value={((idx + 1) / questions.length) * 100} className="h-2" />
      </div>
      <p className="text-base font-semibold leading-snug text-slate-900">{q.question}</p>
      <ul className="space-y-2">
        {q.options.map((opt) => {
          const isCorrect = opt === q.correctAnswer
          const isPicked = opt === picked
          const show = revealed
          return (
            <li key={opt}>
              <button
                type="button"
                onClick={() => pickOption(opt)}
                className={cn(
                  "w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition-colors",
                  !show && "border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50",
                  show && isCorrect && "border-green-500 bg-green-50 text-green-900",
                  show && isPicked && !isCorrect && "border-red-400 bg-red-50 text-red-900",
                  show && !isPicked && !isCorrect && "border-slate-100 bg-slate-50 text-slate-400",
                )}
              >
                {opt}
              </button>
            </li>
          )
        })}
      </ul>
      {revealed && q.explanation ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{q.explanation}</p>
      ) : null}
      <Button className="w-full" variant="secondary" disabled={!revealed} onClick={advance}>
        {idx >= questions.length - 1 ? "Finish" : "Next question"}
      </Button>
    </div>
  )
}
