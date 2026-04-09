import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/services/auth-service"
import { setParentGateCookie } from "@/lib/parent-gate-cookie"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  childId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(1),
})

/**
 * Student flow: parent proves identity before age ≤6 holistic quiz.
 * Sets httpOnly cookie validated by /api/assessment/generate.
 */
export async function POST(req: Request) {
  try {
    const body = bodySchema.parse(await req.json())

    const child = await prisma.child.findUnique({
      where: { id: body.childId },
      select: { id: true, parentId: true },
    })
    if (!child) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { id: child.parentId },
      select: { email: true, passwordHash: true },
    })
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Account cannot verify with password" }, { status: 400 })
    }

    if (user.email.trim().toLowerCase() !== body.email.trim().toLowerCase()) {
      return NextResponse.json({ error: "Email does not match this student’s parent account" }, { status: 401 })
    }

    const ok = await verifyPassword(body.password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    setParentGateCookie(res, child.id)
    return res
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }
    console.error("[verify-parent]", e)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
