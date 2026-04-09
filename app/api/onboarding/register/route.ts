import { NextResponse } from "next/server"
import { z } from "zod"
import { registerOnboardingUser } from "@/services/onboarding-flow-service"

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(6),
  country: z.string().min(1),
  religion: z.string().min(1),
  role: z.enum(["parent", "guardian"]),
})

export async function POST(request: Request) {
  try {
    const json = await request.json()
    const body = bodySchema.parse(json)
    const user = await registerOnboardingUser({
      name: body.name,
      email: body.email,
      password: body.password,
      phone: body.phone,
      country: body.country,
      religion: body.religion,
      role: body.role,
    })
    return NextResponse.json({ userId: user.id })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Something went wrong"
    const code = (e as Error & { code?: string }).code
    if (code === "EMAIL_EXISTS" || msg.includes("Email already")) {
      return NextResponse.json({ error: msg, code: "EMAIL_EXISTS" }, { status: 409 })
    }
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: e.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
