import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/auth-helpers"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const ageGroups = await prisma.curriculumAgeGroup.findMany({
      orderBy: [{ orderIndex: "asc" }, { ageMin: "asc" }],
      select: { id: true, name: true, stageName: true, ageMin: true, ageMax: true, orderIndex: true },
    })
    return NextResponse.json({ ageGroups })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch age groups"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

const AGE_GROUP_DEFINITIONS = [
  { name: "4-5", stageName: "Little Explorers 🌱", ageMin: 4, ageMax: 5, orderIndex: 1 },
  { name: "5-6", stageName: "Mini Adventurers 🐾", ageMin: 5, ageMax: 6, orderIndex: 2 },
  { name: "6-7", stageName: "Curious Minds 🔍", ageMin: 6, ageMax: 7, orderIndex: 3 },
  { name: "7-8", stageName: "Young Investigators 🧩", ageMin: 7, ageMax: 8, orderIndex: 4 },
  { name: "8-9", stageName: "Growing Learners 💡", ageMin: 8, ageMax: 9, orderIndex: 5 },
  { name: "9-10", stageName: "Knowledge Explorers 🚀", ageMin: 9, ageMax: 10, orderIndex: 6 },
  { name: "10-11", stageName: "Knowledge Builders 🏗️", ageMin: 10, ageMax: 11, orderIndex: 7 },
  { name: "11-12", stageName: "Skill Sharpeners ⚡", ageMin: 11, ageMax: 12, orderIndex: 8 },
  { name: "12-13", stageName: "Future Leaders 🌟", ageMin: 12, ageMax: 13, orderIndex: 9 },
]

export async function POST() {
  try {
    await requireRole("admin")

    for (const group of AGE_GROUP_DEFINITIONS) {
      await prisma.curriculumAgeGroup.upsert({
        where: { name: group.name },
        update: {
          stageName: group.stageName,
          ageMin: group.ageMin,
          ageMax: group.ageMax,
          orderIndex: group.orderIndex,
        },
        create: {
          name: group.name,
          stageName: group.stageName,
          ageMin: group.ageMin,
          ageMax: group.ageMax,
          orderIndex: group.orderIndex,
        },
      })
    }

    const ageGroups = await prisma.curriculumAgeGroup.findMany({
      orderBy: [{ orderIndex: "asc" }, { ageMin: "asc" }],
      select: { id: true, name: true, stageName: true, ageMin: true, ageMax: true, orderIndex: true },
    })

    return NextResponse.json({ ageGroups })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ensure age groups"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
