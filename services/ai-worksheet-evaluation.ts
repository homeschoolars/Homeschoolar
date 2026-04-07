import "server-only"
import { generateObject } from "ai"
import { z } from "zod"
import { openai, isOpenAIConfigured } from "@/lib/openai"

const evaluationSchema = z.object({
  feedback: z.string().min(1).describe("Encouraging, specific feedback for the student and parent"),
  weak_topics: z.array(z.string()).default([]).describe("Short labels for concepts to review"),
})

export type WorksheetEvalContext = {
  studentName?: string
  rows: Array<{
    question_id: string
    question: string
    correct_answer: string
    student_answer: string
    is_correct: boolean
  }>
  score: number
  maxScore: number
  percentage: number
}

/**
 * OpenAI pass for narrative feedback + weak areas. Numeric score is computed server-side from `correct_answer`.
 */
export async function generateWorksheetAiFeedback(ctx: WorksheetEvalContext): Promise<z.infer<typeof evaluationSchema>> {
  if (!isOpenAIConfigured()) {
    const missed = ctx.rows.filter((r) => !r.is_correct).length
    return {
      feedback:
        missed === 0
          ? `Perfect work — ${ctx.score}/${ctx.maxScore} (${ctx.percentage}%). Keep exploring this topic!`
          : `You scored ${ctx.score}/${ctx.maxScore} (${ctx.percentage}%). Review the questions you missed and try similar practice.`,
      weak_topics: ctx.rows.filter((r) => !r.is_correct).map((r) => r.question.slice(0, 80)),
    }
  }

  const prompt = `Evaluate student answers against the correct answers for a homeschool worksheet.
Student: ${ctx.studentName ?? "Student"}
Score (verified): ${ctx.score}/${ctx.maxScore} (${ctx.percentage}%).

Per question:
${ctx.rows
  .map(
    (r, i) =>
      `${i + 1}. Q: ${r.question}\n   Correct: ${r.correct_answer}\n   Student: ${r.student_answer}\n   Match: ${r.is_correct ? "yes" : "no"}`,
  )
  .join("\n\n")}

Return concise feedback and weak_topics (short topic names only). Do not change the numeric score.`

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: evaluationSchema,
    prompt,
  })

  return object
}
