import { NextResponse } from "next/server"
import { z } from "zod"
import { registerUser } from "@/services/auth-service"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json())
    const user = await registerUser({
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      role: "parent",
    })

    return NextResponse.json({ userId: user.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
