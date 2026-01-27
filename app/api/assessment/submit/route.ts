import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { submitAssessment } from "@/services/assessment-service"
import { z } from "zod"

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

    // Update raw_answers in assessment
    const { prisma } = await import("@/lib/prisma")
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
