import { NextResponse } from "next/server"
import { z } from "zod"
import { findChildByLoginCode } from "@/services/student-service"
import { serializeChild } from "@/lib/serializers"

export async function POST(request: Request) {
  try {
    const body = z.object({ loginCode: z.string().min(1) }).parse(await request.json())
    const loginCode = body.loginCode.toUpperCase().trim()

    if (!loginCode || typeof loginCode !== "string") {
      return NextResponse.json({ error: "Login code is required" }, { status: 400 })
    }

    const child = await findChildByLoginCode(loginCode)

    if (!child) {
      return NextResponse.json({ error: "Invalid student code. Please check and try again." }, { status: 404 })
    }

    const serialized = serializeChild(child)

    // Return child data (without sensitive parent info)
    return NextResponse.json({
      success: true,
      child: {
        id: serialized.id,
        name: serialized.name,
        age_group: serialized.age_group,
        current_level: serialized.current_level,
        assessment_completed: serialized.assessment_completed,
        login_code: serialized.login_code,
      },
    })
  } catch (error) {
    console.error("Student login error:", error)
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
