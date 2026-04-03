import { NextResponse } from "next/server"
import { getStudentDashboard } from "@/services/student-service"
import { serializeAssignment, serializeChild, serializeProgress, serializeSubject, serializeSurpriseQuiz } from "@/lib/serializers"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const { childId } = await request.json()

    if (!childId) {
      return fail("Child ID is required", 400)
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId, session, request })

    const { subjects, assignments, progress, child, pendingQuiz } = await getStudentDashboard(childId)

    const response = {
      subjects: (subjects || []).map(serializeSubject),
      assignments: (assignments || []).map((assignment) =>
        serializeAssignment({
          ...assignment,
          worksheet: assignment.worksheet ?? undefined,
        }),
      ),
      progress: (progress || []).map(serializeProgress),
      child: child ? serializeChild(child) : null,
      pendingQuiz: pendingQuiz ? serializeSurpriseQuiz(pendingQuiz) : null,
    }

    return ok(response)
  } catch (error) {
    console.error("Student dashboard error:", error)
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
