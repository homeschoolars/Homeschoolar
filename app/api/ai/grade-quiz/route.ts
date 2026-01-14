import { generateObject } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { Answer, QuizQuestion } from "@/lib/types"

const quizGradingSchema = z.object({
  score: z.number(),
  graded_answers: z.array(
    z.object({
      question_id: z.string(),
      is_correct: z.boolean(),
      feedback: z.string(),
    }),
  ),
  overall_feedback: z.string(),
  encouragement: z.string(),
})

export async function POST(req: Request) {
  try {
    const { quiz_id, answers, age_group } = (await req.json()) as {
      quiz_id: string
      answers: Answer[]
      age_group: string
    }

    const supabase = await createClient()

    // Get quiz
    const { data: quiz } = await supabase.from("surprise_quizzes").select("*").eq("id", quiz_id).single()

    if (!quiz) {
      return Response.json({ error: "Quiz not found" }, { status: 404 })
    }

    const questions = quiz.questions as QuizQuestion[]
    const questionsWithAnswers = questions.map((q) => {
      const studentAnswer = answers.find((a) => a.question_id === q.id)
      return {
        id: q.id,
        question: q.question,
        correct_answer: q.correct_answer,
        student_answer: studentAnswer?.answer || "Not answered",
        points: q.points,
      }
    })

    const prompt = `Grade this surprise quiz for a ${age_group} year old student!

Questions and Answers:
${questionsWithAnswers
  .map(
    (q, i) => `
Question ${i + 1}: ${q.question}
Correct Answer: ${q.correct_answer}
Student's Answer: ${q.student_answer}
`,
  )
  .join("\n")}

Requirements:
1. Grade each answer (correct/incorrect)
2. Provide brief, encouraging feedback for each
3. Keep feedback fun and age-appropriate
4. Give an overall encouraging message
5. Include a special encouragement phrase (like "Super Star!" or "Amazing Work!")
6. Be supportive even if they got some wrong`

    const result = await generateObject({
      model: "google/gemini-2.0-flash",
      schema: quizGradingSchema,
      prompt,
      maxOutputTokens: 1500,
    })

    // Update quiz with results
    const { error } = await supabase
      .from("surprise_quizzes")
      .update({
        answers,
        score: result.object.score,
        feedback: result.object.overall_feedback,
        completed_at: new Date().toISOString(),
      })
      .eq("id", quiz_id)

    if (error) {
      console.error("Error updating quiz:", error)
    }

    return Response.json({
      ...result.object,
      max_score: quiz.max_score,
    })
  } catch (error) {
    console.error("Error grading quiz:", error)
    return Response.json({ error: "Failed to grade quiz" }, { status: 500 })
  }
}
