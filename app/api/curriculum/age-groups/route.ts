import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const ageGroups = await prisma.curriculumAgeGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, stageName: true },
    })
    return NextResponse.json({ ageGroups })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch age groups"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
