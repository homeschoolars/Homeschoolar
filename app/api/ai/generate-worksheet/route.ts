import type { GenerateWorksheetRequest } from "@/lib/types"
import { requireSession } from "@/lib/auth-helpers"
import { generateWorksheet } from "@/services/ai-service"
import { serializeWorksheet } from "@/lib/serializers"

export async function POST(req: Request) {
  try {
    const body: GenerateWorksheetRequest = await req.json()
    const session = await requireSession()
    const worksheet = await generateWorksheet(body, session.user.id)
    return Response.json({ worksheet: serializeWorksheet(worksheet) })
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error generating worksheet:", error)
    return Response.json({ error: "Failed to generate worksheet" }, { status: 500 })
  }
}
