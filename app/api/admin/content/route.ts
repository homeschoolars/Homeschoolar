import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"
import { serializeSubject } from "@/lib/serializers"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    await requireRole("admin")

    const [subjects, worksheets, quizzes] = await Promise.all([
      prisma.subject.findMany({ orderBy: { displayOrder: "asc" } }),
      prisma.worksheet.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          subjectId: true,
          ageGroup: true,
          difficulty: true,
          isApproved: true,
          isAiGenerated: true,
          createdAt: true,
          subject: { select: { name: true } },
          _count: { select: { assignments: true } },
        },
      }),
      prisma.surpriseQuiz.count(),
    ])

    const worksheetsList = worksheets.map((w) => ({
      id: w.id,
      title: w.title,
      subject: w.subject?.name ?? "",
      age_group: w.ageGroup,
      difficulty: w.difficulty,
      is_approved: w.isApproved,
      is_ai_generated: w.isAiGenerated,
      assignments_count: w._count.assignments,
      created_at: w.createdAt.toISOString(),
    }))

    return NextResponse.json({
      subjects: subjects.map(serializeSubject),
      worksheets: worksheetsList,
      quizzes_count: quizzes,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load content"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
