import type { GradeSubmissionRequest } from "@/lib/types"
import { requireSession } from "@/lib/auth-helpers"
import { gradeSubmission } from "@/services/ai-service"

export async function POST(req: Request) {
  try {
    const body: GradeSubmissionRequest = await req.json()
    const session = await requireSession()
    const result = await gradeSubmission(body, session.user.id)

    return Response.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error grading submission:", error)
    return Response.json({ error: "Failed to grade submission" }, { status: 500 })
  }
}
