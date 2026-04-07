import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/services/auth-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const bodySchema = z.object({
  password: z.string().min(1, "Password is required"),
})

/** Re-verify parent account password (e.g. before holistic assessment for young age bands). */
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "parent") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { password } = bodySchema.parse(await req.json())

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    })

    if (!user?.passwordHash) {
      return NextResponse.json(
        {
          error:
            "No password on this account. Add a password in account settings, or sign in with email and password.",
        },
        { status: 400 },
      )
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten().fieldErrors.password?.[0] ?? "Invalid request" }, { status: 400 })
    }
    console.error("[parent/verify-password]", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}
