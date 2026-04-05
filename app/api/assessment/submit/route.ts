import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { submitAssessment } from "@/services/assessment-service"
import { z } from "zod"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const submitAssessmentSchema = z.object({
  assessment_id: z.string().uuid(),
  raw_answers: z.record(z.unknown()),
  answers: z.array(z.object({
    question_id: z.string(),
    answer: z.string(),
  })),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = submitAssessmentSchema.parse(await request.json())
    const userId = session.user.id

    const { prisma } = await import("@/lib/prisma")
    const assessment = await prisma.assessment.findUnique({
      where: { id: body.assessment_id },
      select: { id: true, childId: true },
    })
    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    }
    await enforceParentOrStudentChildAccess({
      childId: assessment.childId,
      session,
      request,
    })

    // Update raw_answers in assessment
    await prisma.assessment.update({
      where: { id: body.assessment_id },
      data: { rawAnswers: body.raw_answers as unknown as object },
    })

    const result = await submitAssessment({
      assessmentId: body.assessment_id,
      answers: body.answers,
      userId,
    })

    return NextResponse.json({
      assessment_id: body.assessment_id,
      raw_score: result.rawScore,
      normalized_score: result.normalizedScore,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      ai_summary: result.aiSummary,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit assessment"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
