import { auth } from "@/auth"
import { generateAICurriculum, saveCurriculum } from "@/services/curriculum-composer-service"
import { enforceParentChildAccess } from "@/lib/auth-helpers"
import { safeParseRequestJson } from "@/lib/safe-json"
import { z } from "zod"

const generateCurriculumSchema = z.object({
  child_id: z.string().uuid(),
})

/**
 * Generate AI-driven personalized curriculum
 * 
 * Uses 3-layer curriculum system:
 * 1. Master Knowledge Framework (static reference)
 * 2. Student Learning Profile (dynamic, from assessments)
 * 3. AI Curriculum Composer (generates personalized curriculum)
 */
export async function POST(req: Request) {
  try {
    // Authenticate
    const session = await auth()
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate request
    const body = await safeParseRequestJson(req, {})
    const validated = generateCurriculumSchema.parse(body)
    const { child_id } = validated

    // Authorize access
    await enforceParentChildAccess(child_id, session)

    // Generate curriculum using 3-layer system
    const curriculum = await generateAICurriculum(child_id, session.user.id)

    // Save curriculum to database
    await saveCurriculum(child_id, curriculum)

    return Response.json({
      curriculum,
      message: "Personalized curriculum generated successfully",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

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

      if (message.includes("Assessment data is missing") || message.includes("learning profile")) {
        return Response.json(
          { error: "Please complete assessments before generating curriculum" },
          { status: 400 }
        )
      }
    }

    console.error("[Generate Curriculum] Error:", error)
    return Response.json(
      { error: "Failed to generate curriculum. Please try again." },
      { status: 500 }
    )
  }
}
