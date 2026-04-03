import { NextResponse } from "next/server"
import { listCurriculumSubjects } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const age = searchParams.get("age")
    if (!age) {
      return NextResponse.json({ error: "age query param is required" }, { status: 400 })
    }
    const subjects = await listCurriculumSubjects(age)
    if (!subjects) {
      return NextResponse.json({ error: "Age group not found" }, { status: 404 })
    }
    return NextResponse.json({ subjects })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch subjects"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
