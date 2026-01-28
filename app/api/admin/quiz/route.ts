import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createQuizSchema = z.object({
  subject: z.string().min(1),
  age_band: z.enum(["4-7", "8-13"]),
  questions: z.array(z.unknown()),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin"])
    const body = createQuizSchema.parse(await request.json())

    const quiz = await prisma.adminQuiz.create({
      data: {
        subject: body.subject,
        ageBand: body.age_band === "4-7" ? "AGE_4_7" : "AGE_8_13",
        questions: body.questions as unknown as object,
        difficulty: body.difficulty ?? "medium",
      },
    })

    return NextResponse.json({
      id: quiz.id,
      subject: quiz.subject,
      age_band: quiz.ageBand,
      difficulty: quiz.difficulty,
      questions: quiz.questions,
      created_at: quiz.createdAt.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create quiz"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET() {
  try {
    await requireRole(["admin"])

    const quizzes = await prisma.adminQuiz.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({
      quizzes: quizzes.map((q) => ({
        id: q.id,
        subject: q.subject,
        age_band: q.ageBand,
        difficulty: q.difficulty,
        questions: q.questions,
        created_at: q.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get quizzes"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
