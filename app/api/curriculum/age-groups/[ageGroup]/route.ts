import { NextResponse } from "next/server"
import { getCurriculumByAgeGroup } from "@/services/curriculum-structured-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ageGroup: string }> }
) {
  try {
    const { ageGroup } = await params
    const decodedAgeGroup = decodeURIComponent(ageGroup)
    const data = await getCurriculumByAgeGroup(decodedAgeGroup)

    if (!data) {
      return NextResponse.json({ error: "Age group not found" }, { status: 404 })
    }

    return NextResponse.json({ ageGroup: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch curriculum"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
