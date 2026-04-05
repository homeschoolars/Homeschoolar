import "server-only"
import { prisma } from "@/lib/prisma"
import { assertStudentLessonContentAccess } from "@/services/progression"
import { getSiteBranding, resolveLogoAbsolute } from "@/lib/site-branding"
import { renderAdaptiveContentPdf } from "@/services/adaptive-pdf-render"
import type { AdaptiveContentType } from "@/services/adaptive-ai-validation"

/**
 * Build a branded PDF for cached adaptive content (quiz | worksheet | story).
 * Enforces lesson access for the student before reading stored JSON.
 */
export async function generatePDF(params: {
  studentId: string
  lessonId: string
  contentType: AdaptiveContentType
  requestOrigin: string
  includeAnswerKey?: boolean
}): Promise<{ buffer: Buffer; filename: string }> {
  const { studentId, lessonId, contentType, requestOrigin, includeAnswerKey = false } = params

  await assertStudentLessonContentAccess(studentId, lessonId)

  const sessionKey = `student:${studentId}`

  const [row, child, lesson] = await Promise.all([
    prisma.curriculumGeneratedContent.findUnique({
      where: { lessonId_type_sessionKey: { lessonId, type: contentType, sessionKey } },
      select: { contentJson: true },
    }),
    prisma.child.findUnique({ where: { id: studentId }, select: { name: true } }),
    prisma.curriculumLesson.findUnique({
      where: { id: lessonId },
      select: { title: true, unit: { select: { subject: { select: { name: true } } } } },
    }),
  ])

  if (!row?.contentJson) {
    throw new Error("NoGeneratedContent")
  }

  const branding = getSiteBranding()
  const logoAbsoluteUrl = resolveLogoAbsolute(requestOrigin, branding)

  const buffer = await renderAdaptiveContentPdf({
    branding: { appName: branding.appName, tagline: branding.tagline, logoAbsoluteUrl },
    contentType,
    contentJson: row.contentJson,
    studentName: child?.name ?? "Student",
    subject: lesson?.unit.subject.name ?? "Subject",
    lessonTitle: lesson?.title ?? "Lesson",
    includeAnswerKey: contentType === "quiz" && includeAnswerKey,
  })

  const base = `${contentType}-${(lesson?.title ?? "lesson").replace(/\s+/g, "-").toLowerCase()}`.replace(/[^a-z0-9.-]/g, "")
  const filename = `${base.slice(0, 72)}.pdf`

  return { buffer, filename }
}
