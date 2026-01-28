import type { Answer } from "@/lib/types"
import { completeAssessment } from "@/services/ai-service"
import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { safeParseRequestJson } from "@/lib/safe-json"
import { z } from "zod"

const answerSchema = z.object({
  question_id: z.string(),
  answer: z.string(),
})

const completeAssessmentSchema = z.object({
  assessment_id: z.string().uuid(),
  answers: z.array(answerSchema).min(1),
  age_group: z.string().min(1),
  is_last_subject: z.boolean().optional(),
})

export async function POST(req: Request) {
  // Declare variables outside try block for access in catch block
  let assessmentId: string | null = null
  
  try {
    // Safely parse and validate request body
    const body = await safeParseRequestJson(req, {})
    
    const validated = completeAssessmentSchema.parse(body)
    assessmentId = validated.assessment_id
    const { assessment_id, answers, age_group, is_last_subject } = validated

    // Authenticate
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Authorize access (parent must own the child)
    if (session.user.role === "parent") {
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessment_id },
        select: { childId: true },
      })
      
      if (!assessment) {
        return Response.json({ error: "Assessment not found" }, { status: 404 })
      }
      
      if (assessment.childId) {
        const child = await prisma.child.findFirst({
          where: { id: assessment.childId, parentId: session.user.id },
          select: { id: true },
        })
        if (!child) {
          return Response.json({ error: "Forbidden" }, { status: 403 })
        }
      }
    }

    // Complete assessment with error handling
    const result = await completeAssessment({
      assessment_id,
      answers,
      age_group,
      is_last_subject: is_last_subject ?? false,
    })
    
    return Response.json(result)
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error(`[Complete Assessment] Validation error (${assessmentId}):`, error.errors)
      return Response.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    
    // Handle specific errors
    if (error instanceof Error) {
      const message = error.message
      
      if (message === "Assessment not found") {
        return Response.json({ error: "Assessment not found" }, { status: 404 })
      }
      
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
      
      if (message.includes("schema") || message.includes("validation")) {
        console.error(`[Complete Assessment] Schema validation error (${assessmentId}):`, error)
        return Response.json(
          { error: "Assessment processing error. Please try again." },
          { status: 500 }
        )
      }
    }
    
    // Log error with context
    console.error(`[Complete Assessment] Error (${assessmentId}):`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    
    // Return generic error (don't expose internal details)
    return Response.json(
      { error: "Failed to complete assessment. Please try again." },
      { status: 500 }
    )
  }
}
