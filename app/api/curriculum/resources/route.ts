import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getChildIdFromStudentRequest } from "@/lib/assessment/student-request-auth"
import { auth } from "@/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const querySchema = z
  .object({
    childId: z.string().uuid(),
    subject: z.string().min(1),
    topic: z.string().min(1),
    /** Single age (legacy). Prefer ageMin+ageMax so admin-tagged ages match a student band (e.g. 8 or 9 for "8–9"). */
    age: z.coerce.number().int().min(4).max(13).optional(),
    ageMin: z.coerce.number().int().min(4).max(13).optional(),
    ageMax: z.coerce.number().int().min(4).max(13).optional(),
  })
  .superRefine((val, ctx) => {
    const range = val.ageMin != null && val.ageMax != null
    const single = val.age != null
    if (!range && !single) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide age or ageMin and ageMax" })
    }
    if (range && val.ageMin! > val.ageMax!) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ageMin must be <= ageMax" })
    }
  })

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const parsed = querySchema.safeParse({
      childId: searchParams.get("childId"),
      age: searchParams.get("age"),
      ageMin: searchParams.get("ageMin"),
      ageMax: searchParams.get("ageMax"),
      subject: searchParams.get("subject"),
      topic: searchParams.get("topic"),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 })
    }
    const { childId, subject, topic } = parsed.data
    const amin = parsed.data.ageMin
    const amax = parsed.data.ageMax

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
        subject: { equals: subject, mode: "insensitive" },
        topic: { equals: topic, mode: "insensitive" },
        ...(amin != null && amax != null
          ? { age: { gte: Math.min(amin, amax), lte: Math.max(amin, amax) } }
          : { age: parsed.data.age! }),
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
