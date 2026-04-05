import type { Answer } from "@/lib/types"
import { gradeQuiz } from "@/services/ai-service"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { quiz_id, answers, age_group } = (await req.json()) as {
      quiz_id: string
      answers: Answer[]
      age_group: string
    }

    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    const quiz = await prisma.surpriseQuiz.findUnique({
      where: { id: quiz_id },
      select: { id: true, childId: true },
    })
    if (!quiz) {
      return Response.json({ error: "Quiz not found" }, { status: 404 })
    }
    await enforceParentOrStudentChildAccess({
      childId: quiz.childId,
      session,
      request: req,
    })

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
