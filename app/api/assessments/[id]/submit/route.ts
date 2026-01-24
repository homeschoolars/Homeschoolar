import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { submitAssessment } from "@/services/assessment-service"

const bodySchema = z.object({
  answers: z.array(
    z.object({
      question_id: z.string().min(1),
      answer: z.string().min(1),
    }),
  ),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const body = bodySchema.parse(await request.json())
    const { id } = await params
    const result = await submitAssessment({
      assessmentId: id,
      answers: body.answers,
      userId: session.user.id,
    })
    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit assessment"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
