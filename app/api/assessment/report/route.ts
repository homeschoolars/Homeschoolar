import { NextResponse } from "next/server"
import { z } from "zod"
import { generateObject } from "ai"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import { buildPrompt, SYSTEM_PROMPT, type PromptScores } from "@/lib/assessment/prompts"
import { withRetry, isRateLimitError } from "@/lib/openai-retry"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const scoreEntry = z.object({
  pct: z.number(),
  total: z.number(),
  max: z.number(),
})

const bodySchema = z.object({
  childId: z.string().uuid(),
  age: z.number().int().min(4).max(13),
  scores: z.record(scoreEntry),
  openAnswers: z.record(z.string()),
  /** When true, parent explicitly started a retake (always creates a new AssessmentReport row). */
  retake: z.boolean().optional(),
  questionMetas: z.array(
    z.object({
      s: z.string(),
      q: z.string(),
      open: z.boolean().optional(),
    }),
  ),
})

const reportSchema = z.object({
  learnerType: z.string(),
  interestProfile: z.string(),
  aptitudeProfile: z.string(),
  overallSummary: z.string(),
  strengthsNarrative: z.string(),
  growthNarrative: z.string(),
  personalityInsight: z.string(),
  careerPathways: z.array(z.string()).min(1),
  learningStyleTips: z.array(z.string()).min(1),
  subjectRecommendations: z.array(
    z.object({
      subject: z.string(),
      status: z.enum(["strength", "developing", "needs-support"]),
      recommendation: z.string(),
    }),
  ),
  weeklyPlanSuggestion: z.string(),
  parentMessage: z.string(),
  islamicNote: z.string().nullable(),
})

/** Latest holistic assessment report for a child (parent-only). Always filters by childId. */
export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "parent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const childIdRaw = searchParams.get("childId")
    const parsed = z.string().uuid().safeParse(childIdRaw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid childId" }, { status: 400 })
    }
    const childId = parsed.data

    const child = await prisma.child.findFirst({
      where: { id: childId, parentId: session.user.id },
      select: { id: true },
    })
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const latest = await prisma.assessmentReport.findFirst({
      where: { childId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        age: true,
        scores: true,
        report: true,
        learnerType: true,
        interestProfile: true,
        aptitudeProfile: true,
      },
    })

    return NextResponse.json({ latest })
  } catch (error) {
    console.error("[assessment/report GET]", error)
    const message = error instanceof Error ? error.message : "Failed to load report"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function parseOpenAnswers(raw: Record<string, string>): Record<number, string> {
  const o: Record<number, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(k)
    if (Number.isFinite(n) && typeof v === "string" && v.trim()) o[n] = v.trim()
  }
  return o
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "parent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = bodySchema.parse(await req.json())

    const child = await prisma.child.findFirst({
      where: { id: body.childId, parentId: session.user.id },
      select: { id: true, name: true },
    })
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "OpenAI is not configured" }, { status: 503 })
    }

    const scores = body.scores as PromptScores
    const openAnswers = parseOpenAnswers(body.openAnswers)

    const prompt = buildPrompt({
      childName: child.name,
      age: body.age,
      scores,
      openAnswers,
      questions: body.questionMetas,
    })

    const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${prompt}\n\nRespond with JSON only matching the schema.`

    const result = await withRetry(
      () =>
        generateObject({
          model: openai("gpt-4o-mini"),
          schema: reportSchema,
          prompt: fullPrompt,
          temperature: 0.7,
        }),
      { maxRetries: 2, retryDelay: 1000 },
    )

    const report = result.object

    await prisma.assessmentReport.create({
      data: {
        childId: child.id,
        age: body.age,
        scores: scores as object,
        openAnswers: openAnswers as object,
        report: report as object,
        learnerType: report.learnerType,
        interestProfile: report.interestProfile,
        aptitudeProfile: report.aptitudeProfile,
      },
    })

    await prisma.child.update({
      where: { id: child.id },
      data: { assessmentCompleted: true },
    })

    return NextResponse.json({ report })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 })
    }
    if (isRateLimitError(error)) {
      return NextResponse.json({ error: "Rate limited, try again shortly" }, { status: 429 })
    }
    console.error("[assessment/report]", error)
    const message = error instanceof Error ? error.message : "Failed to generate report"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
