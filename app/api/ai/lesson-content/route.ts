import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth-helpers"
import { generateLessonContent } from "@/services/ai-content-engine"
import { safeParseRequestJson } from "@/lib/safe-json"
import type { AgeGroup } from "@/lib/types"
import type { ContentLanguage } from "@/lib/ai-architecture"

export async function POST(req: Request) {
  try {
    const body = await safeParseRequestJson(req, {} as {
      subject_id: string
      subject_name: string
      topic: string
      concept_id: string
      target_age: AgeGroup
      language?: ContentLanguage
    })
    
    const { subject_id, subject_name, topic, concept_id, target_age, language } = body
    if (!subject_id || !subject_name || !topic || !concept_id || !target_age) {
      return NextResponse.json(
        { error: "subject_id, subject_name, topic, concept_id, target_age required" },
        { status: 400 }
      )
    }
    const session = await requireSession()
    const script = await generateLessonContent({
      subject_id,
      subject_name,
      topic,
      concept_id,
      target_age,
      language: language ?? "en",
      userId: session.user.id,
    })
    return NextResponse.json({ script })
  } catch (error) {
    const err = error as Error
    if (err.message === "Unauthorized" || err.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (err.message.includes("Subscription required") || err.message.includes("Trial expired")) {
      return NextResponse.json({ error: err.message }, { status: 402 })
    }
    if (err.message.includes("rate limit") || err.message.includes("429")) {
      return NextResponse.json({ error: err.message }, { status: 429 })
    }
    if (err.message.includes("Invalid JSON schema") || err.message.includes("400")) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error("Error generating lesson content:", error)
    return NextResponse.json(
      { error: err.message || "Failed to generate lesson content" },
      { status: 500 }
    )
  }
}
