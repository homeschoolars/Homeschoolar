import { NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-helpers"
import { createChild } from "@/services/parent-service"
import { toPrismaAgeGroup } from "@/lib/age-group"
import { serializeChild } from "@/lib/serializers"

const createChildSchema = z.object({
  name: z.string().min(1),
  age_group: z.enum(["4-5", "6-7", "8-9", "10-11", "12-13"]),
})

function generateLoginCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: Request) {
  try {
    const session = await requireRole("parent")
    const body = createChildSchema.parse(await request.json())

    const loginCode = generateLoginCode()
    const child = await createChild({
      parentId: session.user.id,
      name: body.name,
      ageGroup: toPrismaAgeGroup(body.age_group),
      loginCode,
    })

    return NextResponse.json({ child: serializeChild(child) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create child"
    const status = message === "Unauthorized" || message === "Forbidden" ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
