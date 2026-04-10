import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getChildIdFromStudentRequest } from "@/lib/assessment/student-request-auth"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const querySchema = z.object({
  childId: z.string().uuid(),
  /** One integer per curriculum level (e.g. Little Explorers 4–5 → tag resources as age 4). */
  age: z.coerce.number().int().min(4).max(13),
  subject: z.string().min(1),
  topic: z.string().min(1),
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const parsed = querySchema.safeParse({
      childId: searchParams.get("childId"),
      age: searchParams.get("age"),
      subject: searchParams.get("subject"),
      topic: searchParams.get("topic"),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 })
    }
    const { childId, age, subject, topic } = parsed.data

    const sessionChild = getChildIdFromStudentRequest(req)
    const session = await auth()
    const parentOk =
      session?.user?.role === "parent" &&
      (await prisma.child.findFirst({ where: { id: childId, parentId: session.user.id }, select: { id: true } }))

    if (!sessionChild && !parentOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (sessionChild && sessionChild !== childId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const resources = await prisma.curriculumResource.findMany({
      where: {
        age,
        subject: { equals: subject, mode: "insensitive" },
        topic: { equals: topic, mode: "insensitive" },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      resources: resources.map((r) => ({
        id: r.id,
        age: r.age,
        subject: r.subject,
        topic: r.topic,
        resourceType: r.resourceType,
        title: r.title,
        url: r.url,
      })),
    })
  } catch (e) {
    console.error("[curriculum/resources GET]", e)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
