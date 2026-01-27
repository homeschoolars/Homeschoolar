import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createVideoSchema = z.object({
  subject: z.string().min(1),
  age_band: z.enum(["4-7", "8-13"]),
  title: z.string().min(1),
  description: z.string().optional(),
  video_url: z.string().url(),
  duration: z.number().int().positive().optional(),
})

export async function POST(request: Request) {
  try {
    const session = await requireRole(["admin"])
    const body = createVideoSchema.parse(await request.json())

    const video = await prisma.videoLecture.create({
      data: {
        subject: body.subject,
        ageBand: body.age_band === "4-7" ? "AGE_4_7" : "AGE_8_13",
        title: body.title,
        description: body.description ?? null,
        videoUrl: body.video_url,
        duration: body.duration ?? null,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({
      id: video.id,
      subject: video.subject,
      age_band: video.ageBand,
      title: video.title,
      video_url: video.videoUrl,
      created_at: video.createdAt.toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create video lecture"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function GET() {
  try {
    await requireRole(["admin"])

    const videos = await prisma.videoLecture.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json({
      videos: videos.map((v) => ({
        id: v.id,
        subject: v.subject,
        age_band: v.ageBand,
        title: v.title,
        description: v.description,
        video_url: v.videoUrl,
        duration: v.duration,
        created_at: v.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get video lectures"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
