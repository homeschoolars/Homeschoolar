import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

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

const AGE_GROUP_DEFINITIONS = [
  { name: "4-5", stageName: "Little Explorers 🌱" },
  { name: "5-6", stageName: "Mini Adventurers 🐾" },
  { name: "6-7", stageName: "Curious Minds 🔍" },
  { name: "7-8", stageName: "Young Investigators 🧩" },
  { name: "8-9", stageName: "Growing Learners 💡" },
  { name: "9-10", stageName: "Knowledge Explorers 🚀" },
  { name: "10-11", stageName: "Knowledge Builders 🏗️" },
  { name: "11-12", stageName: "Skill Sharpeners ⚡" },
  { name: "12-13", stageName: "Future Leaders 🌟" },
]

export async function POST() {
  try {
    await requireRole("admin")

    for (const group of AGE_GROUP_DEFINITIONS) {
      await prisma.curriculumAgeGroup.upsert({
        where: { name: group.name },
        update: { stageName: group.stageName },
        create: {
          name: group.name,
          stageName: group.stageName,
        },
      })
    }

    const ageGroups = await prisma.curriculumAgeGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, stageName: true },
    })

    return NextResponse.json({ ageGroups })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ensure age groups"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
