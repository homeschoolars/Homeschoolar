import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { submitWorksheetAssignmentForStudent } from "@/services/worksheet-assignment-submit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * POST /api/worksheet/submit
 * Body: { assignmentId, childId, answers: [{ question_id, answer }] }
 */
export async function POST(req: Request) {
  try {
    const session = await auth()
    const body = (await req.json()) as {
      assignmentId?: string
      childId?: string
      answers?: Array<{ question_id: string; answer: string }>
    }

    if (!body.assignmentId || !body.childId || !Array.isArray(body.answers)) {
      return NextResponse.json({ error: "assignmentId, childId, and answers are required" }, { status: 400 })
    }

    await enforceParentOrStudentChildAccess({
      childId: body.childId,
      session,
      request: req,
    })

    const result = await submitWorksheetAssignmentForStudent({
      assignmentId: body.assignmentId,
      childId: body.childId,
      answers: body.answers,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit worksheet"
    if (message === "Worksheet assignment not found") {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    if (message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
