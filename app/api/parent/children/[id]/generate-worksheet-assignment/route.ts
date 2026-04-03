import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { generateWorksheet } from "@/services/ai-service"
import { serializeAssignment, serializeWorksheet } from "@/lib/serializers"
import { toApiAgeGroup } from "@/lib/age-group"
import type { Difficulty } from "@/lib/types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id } = await params
    await enforceParentChildAccess(id, session)

    const body = (await req.json()) as {
      subjectId?: string
      topic?: string
      difficulty?: Difficulty
      numQuestions?: number
    }

    if (!body.subjectId) {
      return NextResponse.json({ error: "subjectId is required" }, { status: 400 })
    }

    const [child, subject] = await Promise.all([
      prisma.child.findUnique({
        where: { id },
        select: { id: true, ageGroup: true, currentLevel: true },
      }),
      prisma.subject.findUnique({
        where: { id: body.subjectId },
        select: { id: true, name: true },
      }),
    ])

    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    const worksheet = await generateWorksheet(
      {
        subject_id: subject.id,
        subject_name: subject.name,
        age_group: toApiAgeGroup(child.ageGroup),
        difficulty: body.difficulty ?? "medium",
        topic: body.topic,
        num_questions: body.numQuestions ?? 5,
        child_level: child.currentLevel,
      },
      session.user.id,
      {
        bypassSubscriptionChecks: session.user.role === "admin",
        // Parent-assigned worksheet should be immediately available.
        autoApprove: true,
      }
    )

    const assignment = await prisma.worksheetAssignment.create({
      data: {
        worksheetId: worksheet.id,
        childId: child.id,
        assignedBy: session.user.id,
        status: "pending",
      },
      include: {
        worksheet: true,
      },
    })

    return NextResponse.json({
      worksheet: serializeWorksheet(worksheet),
      assignment: serializeAssignment(assignment),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate worksheet assignment"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
