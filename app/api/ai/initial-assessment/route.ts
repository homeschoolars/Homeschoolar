import { generateObject } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { AgeGroup } from "@/lib/types"
import { google } from "@ai-sdk/google"

const assessmentSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["multiple_choice", "true_false"]),
      question: z.string(),
      options: z.array(z.string()).optional(),
      correct_answer: z.string(),
      points: z.number(),
      skill_tested: z.string(),
    }),
  ),
})

export async function POST(req: Request) {
  try {
    const { child_id, subject_id, subject_name, age_group } = (await req.json()) as {
      child_id: string
      subject_id: string
      subject_name: string
      age_group: AgeGroup
    }

    let supabase = null
    try {
      supabase = await createClient()
    } catch (e) {
      console.warn("Supabase client init failed:", e)
    }

    const prompt = `Create an initial assessment to determine a ${age_group} year old student's level in ${subject_name}.

Requirements:
1. Create 10 questions of varying difficulty (easy, medium, hard)
2. Start with easier questions and progress to harder ones
3. Cover fundamental concepts for this subject and age group
4. Mix of multiple choice and true/false
5. Each question should test a specific skill
6. Make questions clear and age-appropriate
7. Use encouraging, friendly language
8. Points: Easy (1), Medium (2), Hard (3)

The assessment should help determine if the student is:
- Beginner: Needs to start with foundational concepts
- Intermediate: Has basic understanding, ready for grade-level content
- Advanced: Ready for more challenging material

Create a balanced assessment that accurately gauges the student's level.`

    const result = await generateObject({
      model: google("gemini-1.5-flash"),
      schema: assessmentSchema,
      prompt,
      maxOutputTokens: 3000,
    })

    let assessment = {
      id: "temp_" + Date.now(),
      child_id,
      subject_id,
      questions: result.object.questions,
    }

    // Attempt to save assessment to database, but don't fail if it fails
    if (supabase) {
      try {
        const { data: savedAssessment, error } = await supabase
          .from("assessments")
          .insert({
            child_id,
            subject_id,
            questions: result.object.questions,
          })
          .select()
          .single()

        if (!error && savedAssessment) {
          assessment = savedAssessment
        } else {
          console.warn("Failed to save assessment to DB, returning temporary object:", error)
        }
      } catch (saveError) {
        console.warn("Database operation failed deeply:", saveError)
      }
    }

    return Response.json({ assessment })
  } catch (error) {
    console.error("Error generating assessment:", error)
    return Response.json({ error: "Failed to generate assessment" }, { status: 500 })
  }
}
