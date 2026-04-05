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
      curriculumLessonId?: string
      topic?: string
      difficulty?: Difficulty
      numQuestions?: number
    }

    const [child] = await Promise.all([
      prisma.child.findUnique({
        where: { id },
        select: { id: true, ageGroup: true, currentLevel: true },
      }),
    ])

    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    let subjectId = body.subjectId ?? ""
    let topic = body.topic
    let curriculumLessonId: string | null = body.curriculumLessonId?.trim() || null

    if (curriculumLessonId) {
      const cl = await prisma.curriculumLesson.findUnique({
        where: { id: curriculumLessonId },
        include: {
          unit: {
            include: {
              subject: { select: { name: true, baseSubjectId: true } },
            },
          },
        },
      })
      if (!cl) {
        return NextResponse.json({ error: "Curriculum lesson not found" }, { status: 404 })
      }
      if (cl.unit.subject.baseSubjectId) {
        subjectId = cl.unit.subject.baseSubjectId
      } else {
        const byName = await prisma.subject.findFirst({
          where: { name: { equals: cl.unit.subject.name, mode: "insensitive" } },
          select: { id: true },
        })
        subjectId = byName?.id ?? ""
      }
      topic = topic ?? cl.title
    }

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId or curriculumLessonId is required" }, { status: 400 })
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true },
    })
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    const worksheet = await generateWorksheet(
      {
        subject_id: subject.id,
        subject_name: subject.name,
        age_group: toApiAgeGroup(child.ageGroup),
        difficulty: body.difficulty ?? "medium",
        topic,
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

    if (curriculumLessonId) {
      await prisma.worksheet.update({
        where: { id: worksheet.id },
        data: { lessonId: curriculumLessonId },
      })
    }

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

    const worksheetRow =
      curriculumLessonId != null
        ? await prisma.worksheet.findUnique({ where: { id: worksheet.id } })
        : worksheet

    return NextResponse.json({
      worksheet: serializeWorksheet(worksheetRow ?? worksheet),
      assignment: serializeAssignment(assignment),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate worksheet assignment"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
