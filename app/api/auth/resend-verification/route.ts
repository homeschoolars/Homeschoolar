import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { createAndSendVerificationEmail } from "@/services/email-verification"

// Force dynamic rendering - this route makes database calls
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RESEND_COOLDOWN_MS = 2 * 60 * 1000
const recentResends = new Map<string, number>()

function getCooldownKey(email: string) {
  return `resend:${email.toLowerCase().trim()}`
}

export async function POST(request: Request) {
  try {
    const body = z.object({ email: z.string().email() }).parse(await request.json())
    const email = body.email.trim().toLowerCase()

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { email: true, emailVerified: true },
    })
    if (!user) {
      return NextResponse.json({ error: "No account found for this email" }, { status: 400 })
    }
    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 })
    }

    const key = getCooldownKey(email)
    const last = recentResends.get(key)
    if (last != null && Date.now() - last < RESEND_COOLDOWN_MS) {
      return NextResponse.json(
        { error: "Please wait a few minutes before requesting another verification email" },
        { status: 429 }
      )
    }
    recentResends.set(key, Date.now())
    setTimeout(() => recentResends.delete(key), RESEND_COOLDOWN_MS + 1000)

    await createAndSendVerificationEmail(user.email)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 })
    }
    console.error("[resend-verification]", e)
    return NextResponse.json({ error: "Failed to resend" }, { status: 500 })
  }
}
