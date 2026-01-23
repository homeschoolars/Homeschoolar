import type { AgeGroup } from "@/lib/types"
import { generateQuiz } from "@/services/ai-service"
import { serializeSurpriseQuiz } from "@/lib/serializers"
import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"

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
      userId: session?.user?.id ?? undefined,
    })
    return Response.json({ quiz: serializeSurpriseQuiz(quiz) })
  } catch (error) {
    console.error("Error generating quiz:", error)
    return Response.json({ error: "Failed to generate quiz" }, { status: 500 })
  }
}
