import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { serializeWorksheet } from "@/lib/serializers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const childIdFromQuery = searchParams.get("childId")
    const { id } = await params

    const assignment = await prisma.worksheetAssignment.findUnique({
      where: { id },
      include: { worksheet: true },
    })
    if (!assignment || !assignment.worksheet) {
      return NextResponse.json({ error: "Worksheet assignment not found" }, { status: 404 })
    }

    if (session?.user?.role === "parent") {
      const child = await prisma.child.findUnique({
        where: { id: assignment.childId },
        select: { parentId: true },
      })
      if (!child || child.parentId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session?.user?.role !== "admin") {
      // Student/login-code flow fallback via childId in query.
      if (!childIdFromQuery || childIdFromQuery !== assignment.childId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json({
      assignmentId: assignment.id,
      childId: assignment.childId,
      worksheet: serializeWorksheet(assignment.worksheet),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load worksheet"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    const { id } = await params
    const body = (await req.json()) as {
      childId?: string
      answers?: Array<{ question_id: string; answer: string }>
    }

    if (!body.childId || !Array.isArray(body.answers)) {
      return NextResponse.json({ error: "childId and answers are required" }, { status: 400 })
    }

    const assignment = await prisma.worksheetAssignment.findUnique({
      where: { id },
      include: { worksheet: true },
    })

    if (!assignment || !assignment.worksheet) {
      return NextResponse.json({ error: "Worksheet assignment not found" }, { status: 404 })
    }

    if (assignment.childId !== body.childId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (session?.user?.role === "parent") {
      const child = await prisma.child.findUnique({
        where: { id: assignment.childId },
        select: { parentId: true },
      })
      if (!child || child.parentId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session?.user?.role !== "admin") {
      // Student/login-code flow is allowed when childId matches assignment owner.
      if (assignment.childId !== body.childId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const questions = (assignment.worksheet.questions as Array<{ id: string; correct_answer: string; points: number }>) ?? []
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0)
    const scored = body.answers.map((a) => {
      const q = questions.find((x) => x.id === a.question_id)
      const isCorrect = q ? String(q.correct_answer).trim().toLowerCase() === String(a.answer).trim().toLowerCase() : false
      return {
        ...a,
        is_correct: isCorrect,
        points: isCorrect ? q?.points ?? 0 : 0,
      }
    })
    const score = scored.reduce((sum, s) => sum + s.points, 0)

    const submission = await prisma.worksheetSubmission.create({
      data: {
        assignmentId: assignment.id,
        childId: assignment.childId,
        answers: body.answers,
        score,
        maxScore: totalPoints,
        aiFeedback: `You scored ${score}/${totalPoints}. Keep practicing to improve.`,
      },
    })

    await prisma.worksheetAssignment.update({
      where: { id: assignment.id },
      data: { status: "completed" },
    })

    return NextResponse.json({
      submissionId: submission.id,
      score,
      maxScore: totalPoints,
      answers: scored,
      feedback: submission.aiFeedback,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit worksheet"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
