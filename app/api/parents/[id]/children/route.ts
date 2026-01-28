import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { createChildWithProfile } from "@/services/onboarding-service"
import { serializeChild } from "@/lib/serializers"

// Force dynamic rendering - this route makes database calls via service
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const childSchema = z.object({
  full_name: z.string().min(1),
  date_of_birth: z.string().min(1),
  gender: z.enum(["male", "female", "other", "prefer_not_say"]).optional().nullable(),
  religion: z.enum(["muslim", "non_muslim"]),
  current_education_level: z.string().optional().nullable(),
  interests: z.object({
    preset: z.array(z.string()).optional(),
    custom: z.string().optional().nullable(),
  }),
  learning_styles: z.array(z.enum(["visual", "auditory", "reading_writing", "kinesthetic"])).min(1),
  attention_span: z.enum(["short", "medium", "long"]),
  screen_tolerance: z.enum(["low", "medium", "high"]),
  needs_encouragement: z.boolean(),
  learns_better_with: z.array(z.enum(["games", "stories", "challenges", "step_by_step"])).min(1),
  strengths: z.string().optional().nullable(),
  challenges: z.string().optional().nullable(),
})

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    if (session.user.role !== "admin" && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = childSchema.parse(await request.json())
    const child = await createChildWithProfile({
      parentId: id,
      eventUserId: session.user.id,
      child: {
        fullName: body.full_name,
        dateOfBirth: body.date_of_birth,
        gender: body.gender ?? null,
        religion: body.religion,
        currentEducationLevel: body.current_education_level ?? null,
        interests: body.interests,
        learningStyles: body.learning_styles,
        attentionSpan: body.attention_span,
        screenTolerance: body.screen_tolerance,
        needsEncouragement: body.needs_encouragement,
        learnsBetterWith: body.learns_better_with,
        strengths: body.strengths ?? null,
        challenges: body.challenges ?? null,
      },
    })

    return NextResponse.json({ child: serializeChild(child) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create child"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
