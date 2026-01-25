import type { AgeGroup } from "@/lib/types"
import { generateInitialAssessment } from "@/services/ai-service"
import { serializeAssessment } from "@/lib/serializers"
import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"

export async function POST(req: Request) {
  try {
    const { child_id, subject_id, subject_name, age_group } = (await req.json()) as {
      child_id: string
      subject_id: string
      subject_name: string
      age_group: AgeGroup
    }

    const session = await auth()
    await enforceParentChildAccess(child_id, session)

    const { assessment, source, fallback_reason } = await generateInitialAssessment({
      child_id,
      subject_id,
      subject_name,
      age_group,
    })
    return Response.json({
      assessment: serializeAssessment(assessment),
      source,
      ...(fallback_reason && { fallback_reason }),
    })
  } catch (error) {
    console.error("Error generating assessment:", error)
    const message = error instanceof Error ? error.message : "Failed to generate assessment"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return Response.json({ error: message }, { status })
  }
}
