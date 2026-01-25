import { recommendCurriculum } from "@/services/ai-service"
import { auth } from "@/auth"
import { enforceParentChildAccess } from "@/lib/auth-helpers"

export async function POST(req: Request) {
  try {
    const { child_id } = (await req.json()) as { child_id: string }

    const session = await auth()
    await enforceParentChildAccess(child_id, session)

    const recommendations = await recommendCurriculum({ child_id })
    return Response.json({ recommendations })
  } catch (error) {
    if (error instanceof Error && error.message === "Child not found") {
      return Response.json({ error: "Child not found" }, { status: 404 })
    }
    console.error("Error generating recommendations:", error)
    return Response.json({ error: "Failed to generate recommendations" }, { status: 500 })
  }
}
