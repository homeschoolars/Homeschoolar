import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth-helpers"
import { generateLessonQuiz } from "@/services/ai-lesson-quiz-service"
import { safeParseRequestJson } from "@/lib/safe-json"
import type { AgeGroup } from "@/lib/types"

export async function POST(req: Request) {
  try {
    const body = await safeParseRequestJson(req, {} as {
      subject_id: string
      subject_name: string
      topic: string
      concept_id: string
      age_group: AgeGroup
      lesson_summary?: string
      recent_topics?: string[]
    })
    
    const { subject_id, subject_name, topic, concept_id, age_group, lesson_summary, recent_topics } = body
    if (!subject_id || !subject_name || !topic || !concept_id || !age_group) {
      return NextResponse.json(
        { error: "subject_id, subject_name, topic, concept_id, age_group required" },
        { status: 400 }
      )
    }
    const session = await requireSession()
    const quiz = await generateLessonQuiz({
      subject_id,
      subject_name,
      topic,
      concept_id,
      age_group,
      lesson_summary,
      recent_topics,
      userId: session.user.id,
    })
    return NextResponse.json({ quiz })
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
    console.error("Error generating lesson quiz:", error)
    return NextResponse.json(
      { error: err.message || "Failed to generate lesson quiz" },
      { status: 500 }
    )
  }
}
