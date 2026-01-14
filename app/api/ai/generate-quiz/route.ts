import { generateObject } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { AgeGroup } from "@/lib/types"
import { google } from "@ai-sdk/google"

const quizSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["multiple_choice", "true_false"]),
      question: z.string(),
      options: z.array(z.string()).optional(),
      correct_answer: z.string(),
      points: z.number(),
    }),
  ),
})

export async function POST(req: Request) {
  try {
    const { child_id, subject_id, subject_name, age_group, recent_topics } = (await req.json()) as {
      child_id: string
      subject_id?: string
      subject_name?: string
      age_group: AgeGroup
      recent_topics?: string[]
    }

    let supabase = null
    try {
      supabase = await createClient()
    } catch (e) {
      console.warn("Supabase client init failed:", e)
    }

    // Get random subject if not specified
    let targetSubject = subject_name
    let targetSubjectId = subject_id

    if (!subject_id && supabase) {
      try {
        const { data: subjects } = await supabase.from("subjects").select("id, name").order("display_order")

        if (subjects && subjects.length > 0) {
          const randomIndex = Math.floor(Math.random() * subjects.length)
          targetSubject = subjects[randomIndex].name
          targetSubjectId = subjects[randomIndex].id
        }
      } catch (e) {
        console.warn("Error fetching subjects, defaulting to General Knowledge", e)
      }
    }

    const prompt = `Create a fun surprise quiz for a ${age_group} year old student!

Subject: ${targetSubject || "General Knowledge"}
${recent_topics ? `Recent Topics Studied: ${recent_topics.join(", ")}` : ""}

Requirements:
1. Create exactly 5 quick questions
2. Mix of multiple choice and true/false only (for speed)
3. Make it fun and engaging - this is a "surprise" quiz!
4. Questions should be achievable but slightly challenging
5. Use encouraging, playful language
6. Each question worth 2 points (10 total)
7. Age-appropriate content and vocabulary

Make it exciting! Use fun scenarios and interesting facts.`

    const result = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: quizSchema,
      prompt,
      maxOutputTokens: 2000,
    })

    let quiz = {
      id: "temp_" + Date.now(),
      child_id,
      subject_id: targetSubjectId,
      questions: result.object.questions,
      max_score: result.object.questions.reduce((sum, q) => sum + q.points, 0),
    }

    // Attempt to save quiz to database, but don't fail if it fails
    if (supabase) {
      try {
        const { data: savedQuiz, error } = await supabase
          .from("surprise_quizzes")
          .insert({
            child_id,
            subject_id: targetSubjectId,
            questions: result.object.questions,
            max_score: quiz.max_score,
          })
          .select()
          .single()

        if (!error && savedQuiz) {
          quiz = savedQuiz
          // Update child's last quiz timestamp
          await supabase.from("children").update({ last_quiz_at: new Date().toISOString() }).eq("id", child_id)
        } else {
          console.warn("Failed to save quiz to DB, returning temporary quiz object:", error)
        }
      } catch (saveError) {
        console.warn("Database operation failed deeply:", saveError)
      }
    }

    return Response.json({ quiz })
  } catch (error) {
    console.error("Error generating quiz:", error)
    return Response.json({ error: "Failed to generate quiz" }, { status: 500 })
  }
}
