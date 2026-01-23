import { NextResponse } from "next/server"
import { getStudentDashboard } from "@/services/student-service"
import { serializeAssignment, serializeChild, serializeProgress, serializeSubject } from "@/lib/serializers"
import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"

export async function POST(request: Request) {
  try {
    const { childId } = await request.json()

    if (!childId) {
      return NextResponse.json({ error: "Child ID is required" }, { status: 400 })
    }

    const session = await auth()
    await enforceParentChildAccess(childId, session)

    const { subjects, assignments, progress, child } = await getStudentDashboard(childId)

    const response = {
      success: true,
      subjects: (subjects || []).map(serializeSubject),
      assignments: (assignments || []).map((assignment) =>
        serializeAssignment({
          ...assignment,
          worksheet: assignment.worksheet ?? undefined,
        }),
      ),
      progress: (progress || []).map(serializeProgress),
      child: child ? serializeChild(child) : null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Student dashboard error:", error)
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 })
  }
}
