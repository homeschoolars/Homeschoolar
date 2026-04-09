"use client"

import { useCallback, useEffect, useMemo, startTransition, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api-client"
import type { AssessmentQuiz as QuizType, QuizQuestion } from "@/lib/assessment/types-ai"

type FlatQ = {
  question: QuizQuestion
  subjectLabel: string
  subjectColor: string
  category: string
}

function flattenQuiz(quiz: QuizType): FlatQ[] {
  const out: FlatQ[] = []
  for (const s of quiz.subjects) {
    for (const q of s.questions) {
      out.push({
        question: q,
        subjectLabel: s.label,
        subjectColor: s.color || "#7F77DD",
        category: s.category,
      })
    }
  }
  return out
}

type Props = {
  childId: string
  parentObservationMode: boolean
  onComplete: () => void
}

export function AssessmentQuiz({ childId, parentObservationMode, onComplete }: Props) {
  const [phase, setPhase] = useState<"loading" | "quiz" | "submitting" | "done">("loading")
  const [quiz, setQuiz] = useState<QuizType | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | number>>({})

  const flat = useMemo(() => (quiz ? flattenQuiz(quiz) : []), [quiz])
  const current = flat[index]
  const total = flat.length

  const loadQuiz = useCallback(async () => {
    setPhase("loading")
    setLoadError(null)
    try {
      const res = await apiFetch("/api/assessment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_quiz", childId }),
        credentials: "include",
      })
      const data = (await res.json()) as { quiz?: QuizType; error?: string }
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load assessment.")
        return
      }
      if (!data.quiz) {
        setLoadError("Invalid response.")
        return
      }
      setQuiz(data.quiz)
      setPhase("quiz")
    } catch {
      setLoadError("Something went wrong — please try again.")
    }
  }, [childId])

  useEffect(() => {
    startTransition(() => {
      void loadQuiz()
    })
  }, [loadQuiz])

  const setAnswer = (qid: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }))
  }

  const goNext = () => {
    if (index < total - 1) setIndex((i) => i + 1)
  }
  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1)
  }

  const currentAnswer = current ? answers[current.question.id] : undefined
  const requiresAnswer = current && !["open", "observation_open"].includes(current.question.type)
  const canAdvance =
    current &&
    (current.question.type === "open" || current.question.type === "observation_open"
      ? typeof currentAnswer === "string" && currentAnswer.trim().length > 0
      : currentAnswer !== undefined && currentAnswer !== "")

  const submitAll = async () => {
    if (!quiz) return
    setPhase("submitting")
    try {
      const res = await apiFetch("/api/assessment/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", childId, answers }),
        credentials: "include",
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok) {
        setLoadError(data.error ?? "Submit failed.")
        setPhase("quiz")
        return
      }
      setPhase("done")
      window.setTimeout(() => onComplete(), 1200)
    } catch {
      setLoadError("Submit failed.")
      setPhase("quiz")
    }
  }

  if (phase === "loading" || (phase === "quiz" && !quiz)) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f8f6ff]">
        <div className="text-center px-6">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#7F77DD]" />
          <p className="mt-4 text-lg font-semibold text-slate-800">Preparing your learning guide…</p>
          <p className="mt-1 text-sm text-slate-600">This can take a minute.</p>
          {loadError && (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-red-600">{loadError}</p>
              <Button type="button" className="rounded-xl bg-[#7F77DD]" onClick={() => void loadQuiz()}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (phase === "submitting" || phase === "done") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f8f6ff]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-6 max-w-md rounded-3xl border border-[#ede8ff] bg-white p-10 text-center shadow-xl"
        >
          <div className="text-5xl mb-4">{phase === "done" ? "🎉" : "✨"}</div>
          <p className="text-xl font-bold text-slate-900 font-[family-name:var(--font-heading)]">
            {phase === "done" ? "You&apos;re all set!" : "Generating your report…"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {phase === "submitting"
              ? "We&apos;re saving your answers and building your learning profile."
              : "Taking you to your dashboard…"}
          </p>
          {phase === "submitting" && <Loader2 className="mx-auto mt-6 h-8 w-8 animate-spin text-[#7F77DD]" />}
        </motion.div>
      </div>
    )
  }

  if (!current) return null

  const q = current.question
  const obs = parentObservationMode || q.type.startsWith("observation_")

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#f8f6ff] overflow-hidden">
      <div className="border-b border-[#ede8ff] bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-600">
            <span>
              Question {index + 1} of {total}
            </span>
            <span>{Math.round(((index + 1) / total) * 100)}%</span>
          </div>
          <Progress value={((index + 1) / total) * 100} className="h-2" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-[#ede8ff] bg-white p-6 shadow-sm"
            >
              <Badge
                className="mb-4 border-0 text-white"
                style={{ backgroundColor: current.subjectColor }}
              >
                {current.subjectLabel}
              </Badge>
              {obs && (
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#7F77DD]">
                  Together with a parent
                </p>
              )}
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug">{q.question}</h2>

              <div className="mt-6 space-y-3">
                {(q.type === "mcq" ||
                  q.type === "observation_mcq" ||
                  q.type === "scenario" ||
                  q.type === "image_choice") &&
                  q.options && (
                    <div className="grid gap-2">
                      {q.options.map((opt, i) => {
                        const selected = currentAnswer === opt
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setAnswer(q.id, opt)}
                            className={cn(
                              "rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors",
                              selected
                                ? "border-[#7F77DD] bg-[#EEEDFE] text-slate-900"
                                : "border-[#ede8ff] bg-white text-slate-700 hover:border-[#d8cffc]",
                            )}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  )}

                {(q.type === "scale" || q.type === "observation_scale") && (
                  <div>
                    <div className="mb-2 flex justify-between text-xs text-slate-500">
                      <span>{q.scaleMin ?? "Low"}</span>
                      <span>{q.scaleMax ?? "High"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setAnswer(q.id, n)}
                          className={cn(
                            "h-11 w-11 rounded-xl border-2 text-sm font-bold transition-colors",
                            currentAnswer === n
                              ? "border-[#7F77DD] bg-[#7F77DD] text-white"
                              : "border-[#ede8ff] bg-white text-slate-700",
                          )}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  )}

                {(q.type === "open" || q.type === "observation_open") && (
                  <div>
                    <Textarea
                      value={typeof currentAnswer === "string" ? currentAnswer : ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      className="min-h-[120px] rounded-xl border-[#ede8ff]"
                      placeholder="Type your answer here…"
                      maxLength={2000}
                    />
                    <p className="mt-1 text-right text-xs text-slate-500">
                      {(typeof currentAnswer === "string" ? currentAnswer : "").length}/2000
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex flex-wrap gap-3 justify-between">
            <Button type="button" variant="outline" className="rounded-xl" disabled={index === 0} onClick={goPrev}>
              Previous
            </Button>
            {index < total - 1 ? (
              <Button
                type="button"
                className="rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9]"
                disabled={!canAdvance}
                onClick={goNext}
              >
                Next
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9]"
                disabled={!canAdvance}
                onClick={() => void submitAll()}
              >
                Complete Assessment
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
