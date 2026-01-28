import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { generateLearningRoadmap } from "@/services/roadmap-service"
import { z } from "zod"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const generateRoadmapSchema = z.object({
  student_id: z.string().uuid(),
})

export async function POST(request: Request) {
  // Declare body outside try block for access in catch block
  let body: { student_id: string } | null = null
  
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    body = generateRoadmapSchema.parse(await request.json())
    const userId = session.user.id

    // Verify access
    const { prisma } = await import("@/lib/prisma")
    const student = await prisma.child.findUnique({
      where: { id: body.student_id },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    if (session.user.role === "parent" && student.parentId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (session.user.role !== "parent" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Only parents and admins can generate roadmaps" }, { status: 403 })
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
    const message = err.message || "Failed to generate roadmap"
    
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
    
    console.error(`[Generate Roadmap] Error${body ? ` for student ${body.student_id}` : ""}:`, {
      message,
      status,
      error: String(error),
      studentId: body?.student_id || "unknown",
    })
    
    return NextResponse.json({ error: message }, { status })
  }
}
