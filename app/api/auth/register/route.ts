import { NextResponse } from "next/server"
import { z } from "zod"
import { createParentWithChildren } from "@/services/onboarding-service"

const registerSchema = z.object({
  parent: z.object({
    full_name: z.string().min(1),
    relationship: z.enum(["father", "mother", "guardian", "other"]),
    email: z.string().email(),
    phone: z.string().min(6).optional().nullable(),
    country: z.string().min(1),
    timezone: z.string().min(1),
    password: z.string().min(6),
  }),
  children: z
    .array(
      z.object({
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
      }),
    )
    .min(1),
})

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json())
    const user = await createParentWithChildren({
      parent: {
        fullName: body.parent.full_name,
        relationship: body.parent.relationship,
        email: body.parent.email,
        phone: body.parent.phone ?? null,
        country: body.parent.country,
        timezone: body.parent.timezone,
        password: body.parent.password,
      },
      children: body.children.map((child) => ({
        fullName: child.full_name,
        dateOfBirth: child.date_of_birth,
        gender: child.gender ?? null,
        religion: child.religion,
        currentEducationLevel: child.current_education_level ?? null,
        interests: child.interests,
        learningStyles: child.learning_styles,
        attentionSpan: child.attention_span,
        screenTolerance: child.screen_tolerance,
        needsEncouragement: child.needs_encouragement,
        learnsBetterWith: child.learns_better_with,
        strengths: child.strengths ?? null,
        challenges: child.challenges ?? null,
      })),
    })

    return NextResponse.json({ userId: user.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
