import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    await requireRole("admin")

    const { lessonId } = await params
    const decoded = decodeURIComponent(lessonId)
    const body = (await req.json()) as { title?: string; orderIndex?: number; contentJson?: Record<string, unknown> }

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 })
    }

    const count = await prisma.curriculumLecture.count({ where: { lessonId: decoded } })

    const lecture = await prisma.curriculumLecture.create({
      data: {
        lessonId: decoded,
        title: body.title.trim(),
        orderIndex: body.orderIndex ?? count,
        contentJson: (body.contentJson ?? {}) as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ lecture }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create lecture"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
