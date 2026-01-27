import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getStudentLearningProfile } from "@/services/learning-profile-service"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")

    if (!studentId) {
      return NextResponse.json({ error: "student_id is required" }, { status: 400 })
    }

    // Verify student belongs to user (if parent) or is the user (if student)
    const student = await prisma.child.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
        preferences: true,
        interestsV2: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Check access
    if (session.user.role === "parent" && student.parentId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get learning profile
    const learningProfile = await getStudentLearningProfile(studentId)

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        age_group: student.ageGroup,
        interests: student.interestsV2.map((i) => i.label),
        profile: student.profile,
        preferences: student.preferences,
      },
      learning_profile: learningProfile,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get student profile"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
