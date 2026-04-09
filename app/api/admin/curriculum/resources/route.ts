import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const metaSchema = z.object({
  age: z.coerce.number().int().min(4).max(13),
  subject: z.string().min(1),
  topic: z.string().min(1),
  resourceType: z.enum(["youtube", "pdf", "ppt", "image", "video", "audio", "word"]),
  title: z.string().min(1),
  youtubeUrl: z.string().url().optional(),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const form = await req.formData()
    const age = form.get("age")
    const subject = form.get("subject")
    const topic = form.get("topic")
    const resourceType = form.get("resourceType")
    const title = form.get("title")
    const youtubeUrl = form.get("youtubeUrl")
    const file = form.get("file")

    const meta = metaSchema.parse({
      age,
      subject,
      topic,
      resourceType,
      title,
      youtubeUrl: youtubeUrl && String(youtubeUrl).trim() ? String(youtubeUrl) : undefined,
    })

    let url = ""
    let fileSize: number | null = null

    if (meta.resourceType === "youtube") {
      if (!meta.youtubeUrl) {
        return NextResponse.json({ error: "YouTube URL required" }, { status: 400 })
      }
      url = meta.youtubeUrl.trim()
    } else {
      if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: "File required" }, { status: 400 })
      }
      fileSize = file.size
      const ext = path.extname(file.name) || ".bin"
      const safeName = `${randomUUID()}${ext}`
      const dir = path.join(process.cwd(), "public", "uploads", "curriculum")
      await mkdir(dir, { recursive: true })
      const buf = Buffer.from(await file.arrayBuffer())
      const diskPath = path.join(dir, safeName)
      await writeFile(diskPath, buf)
      url = `/uploads/curriculum/${safeName}`
    }

    const row = await prisma.curriculumResource.create({
      data: {
        age: meta.age,
        subject: meta.subject.trim(),
        topic: meta.topic.trim(),
        resourceType: meta.resourceType,
        title: meta.title.trim(),
        url,
        fileSize,
      },
    })

    return NextResponse.json({
      resource: {
        id: row.id,
        url: row.url,
      },
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    console.error("[admin curriculum upload]", e)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
