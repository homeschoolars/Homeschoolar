import type { AgeGroup } from "@/lib/types"
import { generateInitialAssessment } from "@/services/ai-service"
import { serializeAssessment } from "@/lib/serializers"
import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"
import { safeParseRequestJson } from "@/lib/safe-json"
import { z } from "zod"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const initialAssessmentSchema = z.object({
  child_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  subject_name: z.string().min(1),
  age_group: z.enum(["4-5", "6-7", "8-9", "10-11", "12-13"]),
})

export async function POST(req: Request) {
  let requestId: string | null = null
  
  try {
    // Safely parse request body with validation
    const body = await safeParseRequestJson(req, {})
    
    // Validate request body
    const validated = initialAssessmentSchema.parse(body)
    requestId = validated.child_id || "unknown"
    const { child_id, subject_id, subject_name, age_group } = validated

    // Authenticate and authorize
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    await enforceParentChildAccess(child_id, session)

    // Generate assessment with error handling
    const { assessment, source, fallback_reason } = await generateInitialAssessment({
      child_id,
      subject_id,
      subject_name,
      age_group: age_group as AgeGroup,
    })
    
    return Response.json({
      assessment: serializeAssessment(assessment),
      source,
      ...(fallback_reason && { fallback_reason }),
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error(`[Initial Assessment] Validation error (${requestId}):`, error.errors)
      return Response.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    
    // Handle authentication/authorization errors
    if (error instanceof Error) {
      const message = error.message
      if (message === "Unauthorized" || message.includes("Unauthorized")) {
        return Response.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (message === "Forbidden" || message.includes("Forbidden")) {
        return Response.json({ error: "Forbidden" }, { status: 403 })
      }
      if (message.includes("Subscription required") || message.includes("Trial expired")) {
        return Response.json({ error: message }, { status: 402 })
      }
      if (message.includes("limit") || message.includes("quota")) {
        return Response.json({ error: message }, { status: 429 })
      }
    }
    
    // Log error with context
    console.error(`[Initial Assessment] Error (${requestId}):`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    // Return generic error (don't expose internal details)
    return Response.json(
      { error: "Failed to generate assessment. Please try again." },
      { status: 500 }
    )
  }
}
