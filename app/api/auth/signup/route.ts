import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { createParentWithChildren } from "@/services/onboarding-service"
import { createAndSendVerificationEmail } from "@/services/email-verification"
import { submitOrphanVerification } from "@/services/orphan-verification-service"

const parentSchema = z.object({
  full_name: z.string().min(1),
  relationship: z.enum(["father", "mother", "guardian", "other"]),
  email: z.string().email(),
  phone: z.string().min(6).optional().nullable(),
  country: z.string().min(1),
  timezone: z.string().min(1),
  password: z.string().min(6),
})

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

const orphanVerificationSchema = z.object({
  document_type: z.enum(["death_certificate", "ngo_letter", "other"]),
  document_name: z.string().min(1),
  document_base64: z.string().min(1),
})

const signupSchema = z
  .object({
    parent: parentSchema,
    children: z.array(childSchema).min(1),
    orphan_verification: orphanVerificationSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.parent.relationship === "guardian") {
      if (data.children.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Guardian sign-up with orphan verification requires exactly one child. Add another account for additional children.",
          path: ["children"],
        })
      }
      if (!data.orphan_verification) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please upload orphan verification documentation (death certificate, NGO letter, or other official document).",
          path: ["orphan_verification"],
        })
      }
    } else if (data.orphan_verification) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Orphan verification is only for guardian sign-ups.",
        path: ["orphan_verification"],
      })
    }
  })

export async function POST(request: Request) {
  try {
    const body = signupSchema.parse(await request.json())
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

    if (body.orphan_verification) {
      const firstChild = await prisma.child.findFirst({
        where: { parentId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      })
      if (!firstChild) {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => null)
        return NextResponse.json({ error: "Child record missing after signup" }, { status: 500 })
      }
      try {
        await submitOrphanVerification({
          childId: firstChild.id,
          parentId: user.id,
          documentType: body.orphan_verification.document_type,
          documentName: body.orphan_verification.document_name,
          documentBase64: body.orphan_verification.document_base64,
        })
      } catch (orphanErr) {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => null)
        const msg = orphanErr instanceof Error ? orphanErr.message : "Orphan verification failed"
        return NextResponse.json({ error: msg }, { status: 400 })
      }
    }

    try {
      await createAndSendVerificationEmail(body.parent.email)
    } catch (e) {
      console.error("[signup] Verification email failed:", e)
    }

    return NextResponse.json({ userId: user.id, email: body.parent.email })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sign up"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
