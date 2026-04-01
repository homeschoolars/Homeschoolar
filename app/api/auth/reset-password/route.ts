import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/services/auth-service"
import { consumePasswordResetToken } from "@/services/password-reset"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json())
    const email = await consumePasswordResetToken(body.token)

    if (!email) {
      return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 })
    }

    const passwordHash = await hashPassword(body.password)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message ?? "Invalid request" }, { status: 400 })
    }
    console.error("[reset-password]", e)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
