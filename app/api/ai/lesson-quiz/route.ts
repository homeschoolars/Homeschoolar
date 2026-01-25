import { NextResponse } from "next/server"
import { requireSession } from "@/lib/auth-helpers"
import { generateLessonQuiz } from "@/services/ai-lesson-quiz-service"
import type { AgeGroup } from "@/lib/types"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      subject_id: string
      subject_name: string
      topic: string
      concept_id: string
      age_group: AgeGroup
      lesson_summary?: string
      recent_topics?: string[]
    }
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
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("Error generating lesson quiz:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate lesson quiz" },
      { status: 500 }
    )
  }
}
