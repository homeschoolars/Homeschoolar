import { auth } from "@/auth"
import { enforceParentOrStudentChildAccess } from "@/lib/auth-helpers"
import { fail, ok, statusFromErrorMessage } from "@/lib/api-response"
import { listSharedGeneratedContentForStudent } from "@/services/parent-content-service"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const childId = searchParams.get("childId")
    if (!childId) {
      return fail("childId is required", 400)
    }

    const session = await auth()
    await enforceParentOrStudentChildAccess({ childId, session, request })

    const rows = await listSharedGeneratedContentForStudent(childId)
    return ok({
      items: rows.map((row) => ({
        id: row.id,
        unitId: row.unitId,
        subjectName: row.unit?.subject?.name ?? "",
        unitTitle: row.unit?.title ?? "",
        contentType: row.type,
        content: row.content,
        contentJson: row.contentJson,
        createdAt: row.createdAt,
      })),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch generated content"
    return fail(message, statusFromErrorMessage(message, 500))
  }
}
