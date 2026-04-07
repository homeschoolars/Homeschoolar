import { z } from "zod"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { findPendingAssignmentForWorksheet, submitWorksheetAssignmentForStudent } from "@/services/worksheet-assignment-submit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  worksheet_id: z.string().uuid(),
  student_id: z.string().uuid(),
  answers: z.array(
    z.object({
      question_id: z.string().min(1),
      answer: z.string(),
    }),
  ),
})

/**
 * POST /api/submit-worksheet
 * Canonical body: { worksheet_id, student_id, answers: [{ question_id, answer }] }
 * Resolves the student's pending assignment for that worksheet, then runs grading + AI feedback + analytics.
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    const json = await request.json()
    const body = bodySchema.parse(json)

    await enforceParentOrStudentChildAccess({
      childId: body.student_id,
      session,
      request,
    })

    const pending = await findPendingAssignmentForWorksheet(body.worksheet_id, body.student_id)
    if (!pending) {
      return fail("No pending worksheet assignment found for this student", 404)
    }

    const result = await submitWorksheetAssignmentForStudent({
      assignmentId: pending.id,
      childId: body.student_id,
      answers: body.answers,
    })

    return ok({
      score: result.score,
      percentage: result.percentage,
      feedback: result.feedback,
      weak_topics: result.weak_topics,
      submission_id: result.submissionId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fail(error.message, 400)
    }
    const message = error instanceof Error ? error.message : "Failed to submit worksheet"
    if (message === "AlreadySubmitted") {
      return fail("This worksheet was already submitted", 409)
    }
    if (message === "Forbidden") {
      return fail("Forbidden", 403)
    }
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
