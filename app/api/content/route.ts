import { NextResponse } from "next/server"
import { getCurriculumLesson } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const lessonId = searchParams.get("lessonId")
    if (!lessonId) {
      return NextResponse.json({ error: "lessonId query param is required" }, { status: 400 })
    }
    const lesson = await getCurriculumLesson(lessonId)
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }
    return NextResponse.json({ content: lesson.content, lesson })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch content"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
