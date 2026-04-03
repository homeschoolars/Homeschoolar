import { NextResponse } from "next/server"
import {
  getCurriculumByAgeGroup,
  getCurriculumSubject,
  getCurriculumUnit,
  getCurriculumLesson,
} from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const ageGroup = searchParams.get("ageGroup")
    const subject = searchParams.get("subject")
    const unit = searchParams.get("unit")
    const lesson = searchParams.get("lesson")

    if (lesson) {
      const lessonData = await getCurriculumLesson(lesson)
      if (!lessonData) return NextResponse.json({ error: "Lesson not found" }, { status: 404 })
      return NextResponse.json({ lesson: lessonData })
    }

    if (unit) {
      const unitData = await getCurriculumUnit(unit)
      if (!unitData) return NextResponse.json({ error: "Unit not found" }, { status: 404 })
      return NextResponse.json({ unit: unitData })
    }

    if (subject) {
      if (!ageGroup) {
        return NextResponse.json({ error: "ageGroup is required when fetching by subject" }, { status: 400 })
      }
      const subjectData = await getCurriculumSubject({ ageGroup, subjectId: subject })
      if (!subjectData) return NextResponse.json({ error: "Subject not found" }, { status: 404 })
      return NextResponse.json({ subject: subjectData })
    }

    if (!ageGroup) {
      return NextResponse.json(
        { error: "Provide ageGroup (or one of subject, unit, lesson)." },
        { status: 400 }
      )
    }

    const data = await getCurriculumByAgeGroup(ageGroup)
    if (!data) return NextResponse.json({ error: "Age group not found" }, { status: 404 })
    return NextResponse.json({ ageGroup: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch curriculum"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
