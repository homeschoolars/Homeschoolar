import { recommendCurriculum } from "@/services/ai-service"
import { requireRole, enforceParentChildAccess } from "@/lib/auth-helpers"
import { fail, ok } from "@/lib/api-response"

// Force dynamic rendering - this is an API route that should never be statically generated
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { child_id } = (await req.json()) as { child_id: string }

    const session = await requireRole(["parent", "admin"])
    await enforceParentChildAccess(child_id, session)

    const recommendations = await recommendCurriculum({ child_id })
    return ok({ recommendations })
  } catch (error) {
    if (error instanceof Error && error.message === "Child not found") {
      return fail("Child not found", 404)
    }
    console.error("Error generating recommendations:", error)
    return fail("Failed to generate recommendations", 500)
  }
}
