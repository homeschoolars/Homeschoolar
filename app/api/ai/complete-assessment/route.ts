import { generateObject } from "ai"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import type { Answer, Question, LearningLevel } from "@/lib/types"

const assessmentResultSchema = z.object({
  score: z.number(),
  max_score: z.number(),
  recommended_level: z.enum(["beginner", "intermediate", "advanced"]),
  analysis: z.string(),
  strengths: z.array(z.string()),
  areas_to_work_on: z.array(z.string()),
  suggested_starting_topics: z.array(z.string()),
})

export async function POST(req: Request) {
  try {
    const { assessment_id, answers, age_group } = (await req.json()) as {
      assessment_id: string
      answers: Answer[]
      age_group: string
    }

    const supabase = await createClient()

    // Get assessment
    const { data: assessment } = await supabase
      .from("assessments")
      .select("*, subjects(name)")
      .eq("id", assessment_id)
      .single()

    if (!assessment) {
      return Response.json({ error: "Assessment not found" }, { status: 404 })
    }

    const questions = assessment.questions as (Question & { skill_tested: string })[]
    const questionsWithAnswers = questions.map((q) => {
      const studentAnswer = answers.find((a) => a.question_id === q.id)
      return {
        question: q.question,
        correct_answer: q.correct_answer,
        student_answer: studentAnswer?.answer || "Not answered",
        points: q.points,
        skill_tested: q.skill_tested,
      }
    })

    const prompt = `Analyze this initial assessment for a ${age_group} year old student in ${(assessment as any).subjects?.name || "General"}.

Assessment Results:
${questionsWithAnswers
  .map(
    (q, i) => `
Question ${i + 1} (${q.points} pts - ${q.skill_tested}): 
Correct: ${q.correct_answer}
Student: ${q.student_answer}
`,
  )
  .join("\n")}

Determine:
1. Their score and recommended level (beginner/intermediate/advanced)
2. Their strengths based on correct answers
3. Areas they need to work on
4. Suggested starting topics for their curriculum

Be encouraging and constructive in the analysis.`

    const result = await generateObject({
      model: "google/gemini-2.0-flash",
      schema: assessmentResultSchema,
      prompt,
      maxOutputTokens: 2000,
    })

    // Update assessment with results
    await supabase
      .from("assessments")
      .update({
        answers,
        score: result.object.score,
        recommended_level: result.object.recommended_level,
        completed_at: new Date().toISOString(),
      })
      .eq("id", assessment_id)

    // Update child's level
    await supabase
      .from("children")
      .update({
        current_level: result.object.recommended_level as LearningLevel,
        assessment_completed: true,
      })
      .eq("id", assessment.child_id)

    // Create curriculum path
    await supabase.from("curriculum_paths").upsert({
      child_id: assessment.child_id,
      subject_id: assessment.subject_id,
      current_topic: result.object.suggested_starting_topics[0],
      next_topics: result.object.suggested_starting_topics.slice(1),
      mastery_level:
        result.object.recommended_level === "beginner"
          ? 0
          : result.object.recommended_level === "intermediate"
            ? 40
            : 70,
    })

    return Response.json(result.object)
  } catch (error) {
    console.error("Error completing assessment:", error)
    return Response.json({ error: "Failed to complete assessment" }, { status: 500 })
  }
}
