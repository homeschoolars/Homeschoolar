import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { generateLearningRoadmap } from "@/services/roadmap-service"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const regenerateRoadmapSchema = z.object({
  student_id: z.string().uuid(),
})

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only parents and admins can regenerate
    if (session.user.role !== "parent" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = regenerateRoadmapSchema.parse(await request.json())
    const userId = session.user.id

    // Verify access
    const student = await prisma.child.findUnique({
      where: { id: body.student_id },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (session.user.role === "parent" && student.parentId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const roadmap = await generateLearningRoadmap(body.student_id, userId)

    return NextResponse.json({
      roadmap_id: roadmap.id,
      roadmap_json: roadmap.roadmapJson,
      generated_by: roadmap.generatedBy,
      created_at: roadmap.createdAt.toISOString(),
      last_updated: roadmap.lastUpdated.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to regenerate roadmap"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
