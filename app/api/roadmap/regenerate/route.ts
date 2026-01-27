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

    // Parse request body
    let body
    try {
      const rawBody = await request.json()
      body = regenerateRoadmapSchema.parse(rawBody)
    } catch (parseError) {
      if (parseError instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid request body", details: parseError.errors },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { error: "Request body is required and must be valid JSON" },
        { status: 400 }
      )
    }

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
    const err = error as Error
    const message = err.message || "Failed to regenerate roadmap"
    
    // Map specific errors to appropriate HTTP status codes
    let status = 400
    if (message.includes("Assessment data is missing") || message.includes("Assessment not completed") || message.includes("assessment data")) {
      status = 400 // Bad Request - missing required data
    } else if (message.includes("Subscription required") || message.includes("Trial expired") || message.includes("Subscription inactive")) {
      status = 402 // Payment Required
    } else if (message.includes("Trial AI limit reached")) {
      status = 429 // Too Many Requests
    } else if (message.includes("Student or profile not found") || message.includes("not found")) {
      status = 404
    } else if (message.includes("Unauthorized") || message.includes("Forbidden")) {
      status = 403
    } else if (message.includes("OpenAI API key is not configured")) {
      status = 503 // Service Unavailable
    }
    
    // Extract student_id from error context if available, or use unknown
    const studentId = (error as { studentId?: string })?.studentId || "unknown"
    
    console.error(`[Roadmap Regenerate] Error for student ${studentId}:`, {
      message,
      status,
      error: String(error),
    })
    
    return NextResponse.json({ error: message }, { status })
  }
}
