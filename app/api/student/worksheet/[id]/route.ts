import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { serializeWorksheet } from "@/lib/serializers"
import { submitWorksheetAssignmentForStudent } from "@/services/worksheet-assignment-submit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    const assignment = await prisma.worksheetAssignment.findUnique({
      where: { id },
      include: { worksheet: true },
    })
    if (!assignment || !assignment.worksheet) {
      return NextResponse.json({ error: "Worksheet assignment not found" }, { status: 404 })
    }

    await enforceParentOrStudentChildAccess({
      childId: assignment.childId,
      session,
      request: req,
    })

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

    await enforceParentOrStudentChildAccess({
      childId: assignment.childId,
      session,
      request: req,
    })

    const result = await submitWorksheetAssignmentForStudent({
      assignmentId: assignment.id,
      childId: body.childId,
      answers: body.answers,
    })

    return NextResponse.json({
      ...result,
      score: result.scoreNumeric,
      percentage: result.percentage,
      weak_topics: result.weak_topics,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit worksheet"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
