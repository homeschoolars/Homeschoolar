import { generateObject } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { GenerateWorksheetRequest, AgeGroup, Difficulty } from "@/lib/types"

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(["multiple_choice", "text", "true_false", "fill_blank"]),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correct_answer: z.string(),
  points: z.number(),
  hint: z.string().optional(),
})

const worksheetSchema = z.object({
  title: z.string(),
  description: z.string(),
  questions: z.array(questionSchema),
  answer_key: z.array(
    z.object({
      question_id: z.string(),
      answer: z.string(),
      explanation: z.string(),
    }),
  ),
  explanations: z.array(
    z.object({
      question_id: z.string(),
      step_by_step: z.array(z.string()),
      concept: z.string(),
      tips: z.array(z.string()),
    }),
  ),
})

const ageGroupDescriptions: Record<AgeGroup, string> = {
  "4-5": "preschool/kindergarten level, very simple concepts, lots of visuals, basic recognition",
  "6-7": "early elementary, beginning reading and basic math, simple sentences",
  "8-9": "elementary level, more complex reading, basic arithmetic, introduction to concepts",
  "10-11": "upper elementary, paragraph writing, multi-step math, deeper understanding",
  "12-13": "middle school level, critical thinking, more advanced concepts, longer responses",
}

const difficultyDescriptions: Record<Difficulty, string> = {
  easy: "straightforward questions, clear instructions, foundational concepts",
  medium: "moderate challenge, some application required, builds on basics",
  hard: "challenging questions, requires deeper thinking, problem-solving skills",
}

export async function POST(req: Request) {
  try {
    const body: GenerateWorksheetRequest = await req.json()
    const { subject_id, subject_name, age_group, difficulty, topic, num_questions = 5, child_level } = body

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const prompt = `Create an educational worksheet for homeschooled children.

Subject: ${subject_name}
Age Group: ${age_group} years old (${ageGroupDescriptions[age_group]})
Difficulty: ${difficulty} (${difficultyDescriptions[difficulty]})
${topic ? `Specific Topic: ${topic}` : ""}
${child_level ? `Student's Current Level: ${child_level}` : ""}
Number of Questions: ${num_questions}

Requirements:
1. Questions should be age-appropriate and engaging
2. Mix question types (multiple choice, true/false, fill in blank, short answer)
3. For multiple choice, provide 4 options with clear distractors
4. Include helpful hints for each question
5. Provide detailed explanations that help the child learn
6. Make it fun and encouraging for children
7. Use simple, clear language appropriate for the age group

Generate a complete worksheet with questions, answer key, and detailed explanations.`

    const result = await generateObject({
      model: "google/gemini-2.0-flash",
      schema: worksheetSchema,
      prompt,
      maxOutputTokens: 4000,
    })

    // Save worksheet to database
    const { data: worksheet, error } = await supabase
      .from("worksheets")
      .insert({
        title: result.object.title,
        description: result.object.description,
        subject_id,
        age_group,
        difficulty,
        questions: result.object.questions,
        answer_key: result.object.answer_key,
        explanations: result.object.explanations,
        is_ai_generated: true,
        is_approved: false,
        ai_prompt: prompt,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving worksheet:", error)
      return Response.json({ error: "Failed to save worksheet" }, { status: 500 })
    }

    return Response.json({ worksheet })
  } catch (error) {
    console.error("Error generating worksheet:", error)
    return Response.json({ error: "Failed to generate worksheet" }, { status: 500 })
  }
}
