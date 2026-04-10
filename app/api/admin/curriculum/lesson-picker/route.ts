import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * GET /api/admin/curriculum/lesson-picker
 * Full curriculum tree for admin UI: age band → subject → unit → lesson (with ids).
 */
export async function GET() {
  try {
    await requireRole("admin")

    const ageGroups = await prisma.curriculumAgeGroup.findMany({
      orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        stageName: true,
        ageMin: true,
        ageMax: true,
        subjects: {
          orderBy: [{ displayOrder: "asc" }, { orderIndex: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            slug: true,
            units: {
              orderBy: [{ displayOrder: "asc" }, { orderIndex: "asc" }, { title: "asc" }],
              select: {
                id: true,
                title: true,
                slug: true,
                lessons: {
                  orderBy: [{ displayOrder: "asc" }, { orderIndex: "asc" }, { title: "asc" }],
                  select: {
                    id: true,
                    title: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return NextResponse.json({ ageGroups })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load curriculum"
    if (message === "Unauthorized" || message === "Forbidden") {
      return NextResponse.json({ error: message }, { status: 403 })
    }
    console.error("[admin/curriculum/lesson-picker]", e)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
