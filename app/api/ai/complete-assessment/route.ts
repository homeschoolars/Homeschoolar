import type { Answer } from "@/lib/types"
import { completeAssessment } from "@/services/ai-service"
import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { assessment_id, answers, age_group } = (await req.json()) as {
      assessment_id: string
      answers: Answer[]
      age_group: string
    }

    const session = await auth()
    if (session?.user?.role === "parent") {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessment_id },
        select: { childId: true },
      })
      if (assessment?.childId) {
        const child = await prisma.child.findFirst({
          where: { id: assessment.childId, parentId: session.user.id },
          select: { id: true },
        })
        if (!child) {
          return Response.json({ error: "Forbidden" }, { status: 403 })
        }
      }
    }

    const result = await completeAssessment({
      assessment_id,
      answers,
      age_group,
    })
    return Response.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "Assessment not found") {
      return Response.json({ error: "Assessment not found" }, { status: 404 })
    }
    console.error("Error completing assessment:", error)
    return Response.json({ error: "Failed to complete assessment" }, { status: 500 })
  }
}
