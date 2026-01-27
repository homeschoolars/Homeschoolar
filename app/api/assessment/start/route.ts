import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { createAssessment } from "@/services/assessment-service"
import { z } from "zod"

const startAssessmentSchema = z.object({
  student_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  assessment_type: z.enum(["baseline", "progress", "checkpoint"]).optional(),
  difficulty_level: z.enum(["easy", "medium", "hard"]).optional(),
  conducted_by: z.enum(["parent", "student"]).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = startAssessmentSchema.parse(await request.json())
    const userId = session.user.id

    const assessment = await createAssessment({
      childId: body.student_id,
      subjectId: body.subject_id,
      assessmentType: body.assessment_type ?? "baseline",
      difficultyLevel: body.difficulty_level ?? null,
      userId,
    })

    // Update conducted_by if provided
    if (body.conducted_by) {
      await import("@/lib/prisma").then(({ prisma }) =>
        prisma.assessment.update({
          where: { id: assessment.id },
          data: { conductedBy: body.conducted_by },
        })
      )
    }

    return NextResponse.json({
      assessment_id: assessment.id,
      questions: assessment.questions,
      status: assessment.status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start assessment"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
