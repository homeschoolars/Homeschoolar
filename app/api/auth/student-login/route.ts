import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { findChildByLoginCode } from "@/services/student-service"
import { serializeChild } from "@/lib/serializers"
import { syncChildAgeGroupFromProfile } from "@/lib/child-age-sync"
import {
  createStudentSessionToken,
  getStudentSessionCookieOptions,
  STUDENT_SESSION_COOKIE,
} from "@/lib/student-session"

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

    const updateResult = await prisma.child.updateMany({
      where: { id: child.id, firstStudentLoginAt: null },
      data: { firstStudentLoginAt: new Date() },
    })
    const firstStudentLogin = updateResult.count > 0

    await syncChildAgeGroupFromProfile(child.id)

    const childAfter = await prisma.child.findUnique({
      where: { id: child.id },
      include: { profile: { select: { dateOfBirth: true } } },
    })
    if (!childAfter) {
      return NextResponse.json({ error: "Invalid student code. Please check and try again." }, { status: 404 })
    }

    const serialized = serializeChild(childAfter)

    // Return child data (without sensitive parent info)
    const response = NextResponse.json({
      success: true,
      first_student_login: firstStudentLogin,
      child: {
        id: serialized.id,
        name: serialized.name,
        age_group: serialized.age_group,
        learning_class: serialized.learning_class,
        learning_class_key: serialized.learning_class_key,
        current_level: serialized.current_level,
        assessment_completed: serialized.assessment_completed,
        login_code: serialized.login_code,
      },
    })
    response.cookies.set(STUDENT_SESSION_COOKIE, createStudentSessionToken(serialized.id), getStudentSessionCookieOptions())
    return response
  } catch (error) {
    console.error("Student login error:", error)
    const message = error instanceof Error ? error.message : "An unexpected error occurred"
    if (
      message.includes("STUDENT_SESSION_SECRET") ||
      message.includes("NEXTAUTH_SECRET") ||
      message.includes("AUTH_SECRET") ||
      message.includes("student session signing")
    ) {
      return NextResponse.json(
        {
          error:
            "Student sign-in is temporarily unavailable. The server is missing an auth secret. Ask the site owner to set AUTH_SECRET (or STUDENT_SESSION_SECRET) in production.",
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
