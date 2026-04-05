import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { requireRole } from "@/lib/auth-helpers"
import {
  deleteCurriculumLesson,
  getCurriculumLesson,
  updateCurriculumLesson,
  updateCurriculumLessonPrompts,
} from "@/services/curriculum-structured-service"
import { getStudentLessonState } from "@/services/progression"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const { lessonId } = await params
    const decoded = decodeURIComponent(lessonId)
    const lesson = await getCurriculumLesson(decoded)
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
    }

    const session = await auth()
    if (session?.user?.role === "admin") {
      return NextResponse.json({ lesson })
    }

    const { searchParams } = new URL(req.url)
    const childId = searchParams.get("childId")

    if (!childId) {
      return NextResponse.json({ error: "Unauthorized: childId is required for lesson detail" }, { status: 401 })
    }

    await enforceParentOrStudentChildAccess({ childId, session, request: req })

    if (session?.user?.role === "parent") {
      return NextResponse.json({ lesson })
    }

    const state = await getStudentLessonState(childId, decoded)
    if (!state.canAccess) {
      return NextResponse.json({
        lesson: {
          id: lesson.id,
          title: lesson.title,
          slug: lesson.slug,
          difficultyLevel: lesson.difficultyLevel,
          locked: true,
        },
      })
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
      requiredWorksheetCount: number
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
