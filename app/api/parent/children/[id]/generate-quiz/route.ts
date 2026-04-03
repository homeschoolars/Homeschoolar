import { NextResponse } from "next/server"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { generateQuiz } from "@/services/ai-service"
import { serializeSurpriseQuiz } from "@/lib/serializers"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"

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
      subjectName?: string
      recentTopics?: string[]
    }

    const child = await prisma.child.findUnique({
      where: { id },
      select: { id: true, ageGroup: true },
    })
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const quiz = await generateQuiz({
      child_id: child.id,
      subject_id: body.subjectId,
      subject_name: body.subjectName,
      age_group: toApiAgeGroup(child.ageGroup),
      recent_topics: body.recentTopics,
    })

    return NextResponse.json({ quiz: serializeSurpriseQuiz(quiz) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate quiz"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
