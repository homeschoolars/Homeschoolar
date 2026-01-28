import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering - this route makes database calls
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(["parent", "admin"])
    const { id: childId } = await params
    await enforceParentChildAccess(childId, session)

    const [submissions, quizzes] = await Promise.all([
      prisma.worksheetSubmission.findMany({
        where: { childId },
        orderBy: { submittedAt: "desc" },
        take: 8,
        select: {
          id: true,
          submittedAt: true,
          score: true,
          maxScore: true,
          assignment: {
            select: {
              worksheet: {
                select: { title: true, subject: { select: { name: true } } },
              },
            },
          },
        },
      }),
      prisma.surpriseQuiz.findMany({
        where: { childId, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 8,
        select: {
          id: true,
          completedAt: true,
          score: true,
          maxScore: true,
          subject: { select: { name: true } },
        },
      }),
    ])

    type Activity = {
      id: string
      type: "worksheet" | "quiz"
      title: string
      subject: string
      date: string
      score?: number
      maxScore?: number
    }

    const activities: Activity[] = []

    for (const s of submissions) {
      const w = s.assignment?.worksheet
      activities.push({
        id: s.id,
        type: "worksheet",
        title: w?.title ?? "Worksheet",
        subject: w?.subject?.name ?? "General",
        date: s.submittedAt.toISOString(),
        score: s.score != null ? Number(s.score) : undefined,
        maxScore: s.maxScore != null ? Number(s.maxScore) : undefined,
      })
    }
    for (const q of quizzes) {
      if (!q.completedAt) continue
      activities.push({
        id: q.id,
        type: "quiz",
        title: "Surprise Quiz",
        subject: q.subject?.name ?? "General",
        date: q.completedAt.toISOString(),
        score: q.score ?? undefined,
        maxScore: q.maxScore ?? undefined,
      })
    }

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    const recent = activities.slice(0, 12)

    return NextResponse.json({ activities: recent })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch recent activity"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
