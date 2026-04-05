import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import {
  createCurriculumLesson,
  listCurriculumLessons,
} from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const unitId = searchParams.get("unitId")
    if (!unitId) {
      return NextResponse.json({ error: "unitId query param is required" }, { status: 400 })
    }
    const lessons = await listCurriculumLessons(unitId)
    return NextResponse.json({ lessons })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch lessons"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await requireRole("admin")

    const body = (await req.json()) as {
      unitId: string
      title: string
      slug: string
      difficultyLevel?: string
      orderIndex?: number
      displayOrder?: number
      requiredWorksheetCount?: number
      content: {
        storyText: string
        activityInstructions: string
        quizConcept: string
        worksheetExample: string
        parentTip: string
      }
    }

    if (!body.unitId || !body.title || !body.slug || !body.content) {
      return NextResponse.json(
        { error: "unitId, title, slug and content are required" },
        { status: 400 }
      )
    }

    const lesson = await createCurriculumLesson({
      ...body,
      requiredWorksheetCount: body.requiredWorksheetCount,
    })
    return NextResponse.json({ lesson }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create lesson"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
