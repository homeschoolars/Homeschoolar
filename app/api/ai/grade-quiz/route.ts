import type { Answer } from "@/lib/types"
import { gradeQuiz } from "@/services/ai-service"
import { auth } from "@/auth"

export async function POST(req: Request) {
  try {
    const { quiz_id, answers, age_group } = (await req.json()) as {
      quiz_id: string
      answers: Answer[]
      age_group: string
    }

    await auth()
    const result = await gradeQuiz({ quiz_id, answers, age_group })
    return Response.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "Quiz not found") {
      return Response.json({ error: "Quiz not found" }, { status: 404 })
    }
    console.error("Error grading quiz:", error)
    return Response.json({ error: "Failed to grade quiz" }, { status: 500 })
  }
}
