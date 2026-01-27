import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getLearningRoadmap } from "@/services/roadmap-service"
import { prisma } from "@/lib/prisma"

// Next.js 15+ requires params to be Promise and must be awaited
export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { studentId } = await params

    // Verify access
    const student = await prisma.child.findUnique({
      where: { id: studentId },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (session.user.role === "parent" && student.parentId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const roadmap = await getLearningRoadmap(studentId)

    if (!roadmap) {
      return NextResponse.json({ error: "Roadmap not found" }, { status: 404 })
    }

    return NextResponse.json({
      roadmap_id: roadmap.id,
      roadmap_json: roadmap.roadmapJson,
      generated_by: roadmap.generatedBy,
      created_at: roadmap.createdAt.toISOString(),
      last_updated: roadmap.lastUpdated.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get roadmap"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
