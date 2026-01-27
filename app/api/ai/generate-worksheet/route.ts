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
    })
    
    return Response.json({ error: message }, { status })
  }
}
