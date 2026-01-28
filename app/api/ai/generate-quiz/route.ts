import type { AgeGroup } from "@/lib/types"
import { generateQuiz } from "@/services/ai-service"
import { serializeSurpriseQuiz } from "@/lib/serializers"
import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { child_id, subject_id, subject_name, age_group, recent_topics } = (await req.json()) as {
      child_id: string
      subject_id?: string
      subject_name?: string
      age_group: AgeGroup
      recent_topics?: string[]
    }

    const session = await auth()
    await enforceParentChildAccess(child_id, session)

    const quiz = await generateQuiz({
      child_id,
      subject_id,
      subject_name,
      age_group,
      recent_topics,
    })
    return Response.json({ quiz: serializeSurpriseQuiz(quiz) })
  } catch (error) {
    console.error("Error generating quiz:", error)
    const message = error instanceof Error ? error.message : "Failed to generate quiz"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return Response.json({ error: message }, { status })
  }
}
