import { auth } from "@/auth"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { getParentStudentPerformance } from "@/services/parent-student-performance"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/parent/student-performance?student_id=UUID
 * Parent-only: worksheets, quiz-style submissions, weak topics, and rollups.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== "parent") {
      return fail("Forbidden", 403)
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")
    if (!studentId) {
      return fail("student_id is required", 400)
    }

    const data = await getParentStudentPerformance(session.user.id, studentId)
    return ok(data)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load performance"
    if (message === "Forbidden") {
      return fail("Forbidden", 403)
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
