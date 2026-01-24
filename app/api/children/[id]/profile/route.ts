import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { updateChildProfile } from "@/services/onboarding-service"

const updateSchema = z.object({
  full_name: z.string().min(1).optional(),
  date_of_birth: z.string().min(1).optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_say"]).optional().nullable(),
  religion: z.enum(["muslim", "non_muslim"]).optional(),
  current_education_level: z.string().optional().nullable(),
  interests: z
    .object({
      preset: z.array(z.string()).optional(),
      custom: z.string().optional().nullable(),
    })
    .optional(),
  learning_styles: z.array(z.enum(["visual", "auditory", "reading_writing", "kinesthetic"])).optional(),
  attention_span: z.enum(["short", "medium", "long"]).optional(),
  screen_tolerance: z.enum(["low", "medium", "high"]).optional(),
  needs_encouragement: z.boolean().optional(),
  learns_better_with: z.array(z.enum(["games", "stories", "challenges", "step_by_step"])).optional(),
  strengths: z.string().optional().nullable(),
  challenges: z.string().optional().nullable(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const body = updateSchema.parse(await request.json())
    const { id } = await params

    const updated = await updateChildProfile({
      childId: id,
      parentId: session.user.id,
      isAdmin: session.user.role === "admin",
      data: {
        fullName: body.full_name,
        dateOfBirth: body.date_of_birth,
        gender: body.gender ?? undefined,
        religion: body.religion ?? undefined,
        currentEducationLevel: body.current_education_level ?? undefined,
        interests: body.interests ?? undefined,
        learningStyles: body.learning_styles ?? undefined,
        attentionSpan: body.attention_span ?? undefined,
        screenTolerance: body.screen_tolerance ?? undefined,
        needsEncouragement: body.needs_encouragement ?? undefined,
        learnsBetterWith: body.learns_better_with ?? undefined,
        strengths: body.strengths ?? undefined,
        challenges: body.challenges ?? undefined,
      },
    })

    return NextResponse.json({ child: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update child profile"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
