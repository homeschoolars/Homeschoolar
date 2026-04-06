import type { AnswerValue, BankQuestion, SubjectScore } from "@/lib/assessment/types"

export function computeScores(
  questions: BankQuestion[],
  answers: Record<number, AnswerValue | undefined>,
): Record<string, SubjectScore> {
  const agg: Record<string, { total: number; max: number }> = {}

  function add(subject: string, earned: number, possible: number) {
    if (!agg[subject]) agg[subject] = { total: 0, max: 0 }
    agg[subject].total += earned
    agg[subject].max += possible
  }

  questions.forEach((q, i) => {
    const a = answers[i]
    if (!a) return

    if (q.type === "mcq") {
      if (a.type !== "mcq") return
      const ok = a.selectedIndex === q.correctIndex
      add(q.subject, ok ? 1 : 0, 1)
      return
    }

    if (q.type === "observe") {
      if (a.type !== "observe" || !q.weights?.length) return
      const w = q.weights[a.selectedIndex] ?? 0
      const mw = Math.max(...q.weights)
      add(q.subject, w, mw)
      return
    }

    if (q.type === "scale") {
      if (a.type !== "scale") return
      add(q.subject, (a.value - 1) / 4, 1)
      return
    }

    if (q.type === "open") {
      if (a.type !== "open") return
      const min = q.minLength ?? 20
      add(q.subject, a.text.trim().length >= min ? 1 : 0, 1)
    }
  })

  const out: Record<string, SubjectScore> = {}
  for (const [k, v] of Object.entries(agg)) {
    out[k] = {
      total: v.total,
      max: v.max,
      pct: v.max > 0 ? (v.total / v.max) * 100 : 0,
    }
  }
  return out
}

export function extractOpenAnswers(
  questions: BankQuestion[],
  answers: Record<number, AnswerValue | undefined>,
): Record<number, string> {
  const o: Record<number, string> = {}
  questions.forEach((q, i) => {
    if (q.type !== "open") return
    const a = answers[i]
    if (a?.type === "open" && a.text.trim()) o[i] = a.text.trim()
  })
  return o
}
