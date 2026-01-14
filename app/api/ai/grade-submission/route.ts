import { generateObject } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { GradeSubmissionRequest } from "@/lib/types"

const gradingSchema = z.object({
  score: z.number(),
  max_score: z.number(),
  graded_answers: z.array(
    z.object({
      question_id: z.string(),
      answer: z.string(),
      is_correct: z.boolean(),
      feedback: z.string(),
    }),
  ),
  overall_feedback: z.string(),
  areas_to_improve: z.array(z.string()),
  strengths: z.array(z.string()),
})

export async function POST(req: Request) {
  try {
    const body: GradeSubmissionRequest = await req.json()
    const { worksheet, answers, child_age_group } = body

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const questionsWithAnswers = worksheet.questions.map((q) => {
      const studentAnswer = answers.find((a) => a.question_id === q.id)
      return {
        question: q.question,
        type: q.type,
        correct_answer: q.correct_answer,
        student_answer: studentAnswer?.answer || "Not answered",
        points: q.points,
        id: q.id,
      }
    })

    const prompt = `Grade this worksheet submission for a ${child_age_group} year old student.

Worksheet: ${worksheet.title}
Subject: ${worksheet.description}

Questions and Answers:
${questionsWithAnswers
  .map(
    (q, i) => `
Question ${i + 1} (${q.points} points): ${q.question}
Correct Answer: ${q.correct_answer}
Student's Answer: ${q.student_answer}
`,
  )
  .join("\n")}

Requirements:
1. Grade each answer fairly, considering partial credit where appropriate
2. Provide encouraging, constructive feedback for each answer
3. Use age-appropriate language (for ${child_age_group} year olds)
4. Be supportive and positive while helping them learn
5. Identify specific areas where they can improve
6. Highlight what they did well
7. Make the feedback fun and motivating

Grade the submission and provide detailed feedback.`

    const result = await generateObject({
      model: "google/gemini-2.0-flash",
      schema: gradingSchema,
      prompt,
      maxOutputTokens: 3000,
    })

    return Response.json(result.object)
  } catch (error) {
    console.error("Error grading submission:", error)
    return Response.json({ error: "Failed to grade submission" }, { status: 500 })
  }
}
