import "server-only"
import { z } from "zod"

/** Strict quiz: exactly 10 MCQs, 4 options each, explanation per question. */
export const adaptiveQuizOutputSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).length(4),
        correctAnswer: z.string().min(1),
        explanation: z.string().min(1),
      }),
    )
    .length(10),
})

export type AdaptiveQuizOutput = z.infer<typeof adaptiveQuizOutputSchema>

const worksheetActivitySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mcq"),
    question: z.string().min(1),
    options: z.array(z.string().min(1)).length(4),
    correctAnswer: z.string().min(1),
  }),
  z.object({
    type: z.literal("short_answer"),
    question: z.string().min(1),
    /**
     * IMPORTANT: must be present for OpenAI structured output JSON schema.
     * Use null (or empty string) when not applicable.
     */
    hint: z.string().nullable(),
  }),
  z.object({
    type: z.literal("fill_in_blank"),
    prompt: z.string().min(1),
    answers: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal("match"),
    leftColumn: z.array(z.string().min(1)).min(2).max(8),
    rightColumn: z.array(z.string().min(1)).min(2).max(8),
    correctPairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2),
  }),
])

/** 2–3 activities; types: mcq, short_answer, fill_in_blank, match. */
export const adaptiveWorksheetOutputSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
  activities: z.array(worksheetActivitySchema).min(2).max(3),
})

export type AdaptiveWorksheetOutput = z.infer<typeof adaptiveWorksheetOutputSchema>
export type AdaptiveWorksheetActivity = AdaptiveWorksheetOutput["activities"][number]

/** Hands-on lesson activity: objective, materials, ordered steps, optional parent tip. */
export const adaptiveActivityOutputSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  materials: z.array(z.string().min(1)).min(1).max(12),
  steps: z.array(z.string().min(1)).min(3).max(10),
  /** Present for structured output compatibility; use null when not needed. */
  parentTip: z.string().nullable(),
})

export type AdaptiveActivityOutput = z.infer<typeof adaptiveActivityOutputSchema>

export type AdaptiveContentType = "quiz" | "worksheet" | "activity"

function countFillBlanks(prompt: string): number {
  return (prompt.match(/_{3,}/g) ?? []).length
}

function validateMatchActivity(a: Extract<AdaptiveWorksheetActivity, { type: "match" }>): string | null {
  const leftSet = new Set(a.leftColumn)
  const rightSet = new Set(a.rightColumn)
  const seenLeft = new Set<string>()
  for (const p of a.correctPairs) {
    if (!leftSet.has(p.left)) return "match: pair left must appear in leftColumn"
    if (!rightSet.has(p.right)) return "match: pair right must appear in rightColumn"
    if (seenLeft.has(p.left)) return "match: duplicate left in correctPairs"
    seenLeft.add(p.left)
  }
  if (seenLeft.size !== a.leftColumn.length) return "match: each leftColumn item needs exactly one pair"
  return null
}

export function validateAIOutput(
  contentType: AdaptiveContentType,
  data: unknown,
): { ok: true; data: unknown } | { ok: false; error: string } {
  if (contentType === "quiz") {
    const r = adaptiveQuizOutputSchema.safeParse(data)
    if (!r.success) return { ok: false, error: r.error.message }
    for (const q of r.data.questions) {
      if (!q.options.includes(q.correctAnswer)) {
        return { ok: false, error: "correctAnswer must match one of the four options for each question" }
      }
    }
    return { ok: true, data: r.data }
  }
  if (contentType === "worksheet") {
    const r = adaptiveWorksheetOutputSchema.safeParse(data)
    if (!r.success) return { ok: false, error: r.error.message }
    for (const a of r.data.activities) {
      if (a.type === "mcq" && !a.options.includes(a.correctAnswer)) {
        return { ok: false, error: "MCQ correctAnswer must match one of the options" }
      }
      if (a.type === "fill_in_blank") {
        const n = countFillBlanks(a.prompt)
        if (n === 0) {
          return { ok: false, error: "fill_in_blank prompt must include blank(s) using underscores (e.g. _____)" }
        }
        if (n !== a.answers.length) {
          return { ok: false, error: "fill_in_blank: number of _____ blanks must match answers array length" }
        }
      }
      if (a.type === "match") {
        const err = validateMatchActivity(a)
        if (err) return { ok: false, error: err }
      }
    }
    return { ok: true, data: r.data }
  }
  const r = adaptiveActivityOutputSchema.safeParse(data)
  if (!r.success) return { ok: false, error: r.error.message }
  return { ok: true, data: r.data }
}

export function getZodSchemaForAdaptiveType(contentType: AdaptiveContentType) {
  if (contentType === "quiz") return adaptiveQuizOutputSchema
  if (contentType === "worksheet") return adaptiveWorksheetOutputSchema
  return adaptiveActivityOutputSchema
}
