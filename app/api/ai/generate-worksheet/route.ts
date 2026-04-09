import type { GenerateWorksheetRequest } from "@/lib/types"
import { z } from "zod"
import { requireSession } from "@/lib/auth-helpers"
import { generateWorksheet } from "@/services/ai-service"
import { serializeWorksheet } from "@/lib/serializers"
import { safeParseRequestJson } from "@/lib/safe-json"
import { prisma } from "@/lib/prisma"
import { generateWorksheetWithHolisticTier } from "@/lib/ai/holistic-generators"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const holisticBodySchema = z.object({
  childId: z.string().uuid(),
  topic: z.string().min(1),
  subject: z.string().min(1),
  age: z.number().int().min(4).max(13),
})

export async function POST(req: Request) {
  // Declare body outside try block for access in catch block
  let body: GenerateWorksheetRequest | null = null
  
  try {
    const raw = await safeParseRequestJson(req, {} as Record<string, unknown>)
    const holistic = holisticBodySchema.safeParse(raw)
    if (holistic.success) {
      const session = await requireSession()
      if (session.user.role !== "parent" && session.user.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 })
      }
      const isAdmin = session.user.role === "admin"
      const where =
        isAdmin
          ? { id: holistic.data.childId }
          : { id: holistic.data.childId, parentId: session.user.id }
      const child = await prisma.child.findFirst({
        where,
        select: { aiAssessmentDifficultyTier: true },
      })
      if (!child) {
        return Response.json({ error: "Child not found" }, { status: 404 })
      }
      const worksheet = await generateWorksheetWithHolisticTier({
        age: holistic.data.age,
        topic: holistic.data.topic,
        subject: holistic.data.subject,
        difficultyTier: child.aiAssessmentDifficultyTier,
      })
      return Response.json({ worksheet, holistic: true })
    }

    body = raw as unknown as GenerateWorksheetRequest
    const session = await requireSession()
    
    // Check if user is admin - admins bypass subscription checks
    const isAdmin = session.user.role === "admin"
    
    const worksheet = await generateWorksheet(body, session.user.id, {
      bypassSubscriptionChecks: isAdmin,
      autoApprove: isAdmin,
    })
    return Response.json({ worksheet: serializeWorksheet(worksheet) })
  } catch (error) {
    const err = error as Error
    const message = err.message || "Failed to generate worksheet"
    
    // Map specific errors to appropriate HTTP status codes
    let status = 500
    if (message === "Unauthorized" || message.includes("Unauthorized")) {
      status = 401
    } else if (message.includes("Subscription required") || message.includes("Trial expired") || message.includes("Subscription inactive")) {
      status = 402 // Payment Required
    } else if (message.includes("Trial AI limit reached") || message.includes("Daily limit")) {
      status = 429 // Too Many Requests
    } else if (message.includes("Forbidden")) {
      status = 403
    } else if (message.includes("OpenAI API key") || message.includes("not configured")) {
      status = 503 // Service Unavailable
    } else if (message.includes("Invalid request") || message.includes("Bad Request")) {
      status = 400
    }
    
    console.error("Error generating worksheet:", {
      message,
      status,
      error: String(error),
      subjectId: body?.subject_id || "unknown",
      ageGroup: body?.age_group || "unknown",
    })
    
    return Response.json({ error: message }, { status })
  }
}
