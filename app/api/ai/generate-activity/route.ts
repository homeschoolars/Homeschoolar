import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateTopicActivity } from "@/lib/ai/holistic-generators"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  childId: z.string().uuid(),
  topic: z.string().min(1),
  subject: z.string().min(1),
  age: z.number().int().min(4).max(13),
})

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "parent" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const body = bodySchema.parse(await req.json())
    const isAdmin = session.user.role === "admin"
    const where =
      isAdmin
        ? { id: body.childId }
        : { id: body.childId, parentId: session.user.id }
    const child = await prisma.child.findFirst({ where, select: { id: true } })
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const activity = await generateTopicActivity({
      age: body.age,
      topic: body.topic,
      subject: body.subject,
    })
    return NextResponse.json({ activity })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("[generate-activity]", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    )
  }
}
