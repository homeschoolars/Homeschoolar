import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { createAndSendPasswordResetEmail } from "@/services/password-reset"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const FORGOT_COOLDOWN_MS = 2 * 60 * 1000
const recentRequests = new Map<string, number>()

function cooldownKey(email: string) {
  return `forgot:${email.toLowerCase().trim()}`
}

export async function POST(request: Request) {
  try {
    const body = z.object({ email: z.string().email() }).parse(await request.json())
    const email = body.email.trim().toLowerCase()
    const key = cooldownKey(email)
    const last = recentRequests.get(key)
    if (last != null && Date.now() - last < FORGOT_COOLDOWN_MS) {
      return NextResponse.json({
        ok: true,
        message: "If an account exists, a password reset link has been sent.",
      })
    }

    recentRequests.set(key, Date.now())
    setTimeout(() => recentRequests.delete(key), FORGOT_COOLDOWN_MS + 1000)

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { email: true },
    })
    if (user) {
      await createAndSendPasswordResetEmail(user.email)
    }

    // Never reveal whether an email exists.
    return NextResponse.json({
      ok: true,
      message: "If an account exists, a password reset link has been sent.",
    })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    console.error("[forgot-password]", e)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
