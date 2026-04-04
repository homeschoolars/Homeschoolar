import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import {
  deleteCurriculumLesson,
  getCurriculumLesson,
  updateCurriculumLesson,
  updateCurriculumLessonPrompts,
} from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const lesson = await getCurriculumLesson(decodeURIComponent(lessonId))
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }
    return NextResponse.json({ lesson })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch lesson"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    await requireRole("admin")

    const { lessonId } = await params
    const body = (await req.json()) as Partial<{
      title: string
      slug: string
      orderIndex: number
      displayOrder: number
      content: {
        storyText?: string
        activityInstructions?: string
        quizConcept?: string
        worksheetExample?: string
        parentTip?: string
      }
      prompts: {
        story?: string
        worksheet?: string
        quiz?: string
        project?: string
        debate?: string
        research?: string
        reflection?: string
      }
    }>
    const { prompts, ...lessonBody } = body
    await updateCurriculumLesson(decodeURIComponent(lessonId), lessonBody)
    if (prompts) {
      await updateCurriculumLessonPrompts(decodeURIComponent(lessonId), prompts)
    }
    const lesson = await getCurriculumLesson(decodeURIComponent(lessonId))
    return NextResponse.json({ lesson })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update lesson"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    await requireRole("admin")

    const { lessonId } = await params
    await deleteCurriculumLesson(decodeURIComponent(lessonId))
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete lesson"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
