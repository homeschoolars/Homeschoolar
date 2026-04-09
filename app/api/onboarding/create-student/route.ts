import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { createOnboardingStudent } from "@/services/onboarding-flow-service"
import { levelLabelFromAge } from "@/lib/onboarding/level-from-age"

const bodySchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  age: z.number().int().min(4).max(13),
  level: z.string().optional(),
  goals: z.string().nullable().optional(),
  interests: z.array(z.string()),
  isMuslim: z.boolean(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = bodySchema.parse(await request.json())
    if (body.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const level = body.level?.trim() || levelLabelFromAge(body.age)

    const child = await createOnboardingStudent({
      userId: body.userId,
      name: body.name,
      age: body.age,
      levelLabel: level,
      goals: body.goals ?? null,
      interests: body.interests,
      isMuslim: body.isMuslim,
    })

    return NextResponse.json({ studentId: child.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong"
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: e.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
