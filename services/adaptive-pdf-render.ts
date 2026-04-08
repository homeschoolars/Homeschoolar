import "server-only"
import { renderToBuffer } from "@react-pdf/renderer"
import {
  AdaptiveActivityPDFDocument,
  AdaptiveQuizPDFDocument,
  AdaptiveWorksheetPDFDocument,
  type PdfBrandingProps,
} from "@/components/pdf/adaptive-content-pdf"
import type {
  AdaptiveActivityOutput,
  AdaptiveContentType,
  AdaptiveQuizOutput,
  AdaptiveWorksheetOutput,
} from "@/services/adaptive-ai-validation"

export async function renderAdaptiveContentPdf(params: {
  branding: PdfBrandingProps
  contentType: AdaptiveContentType
  contentJson: unknown
  studentName: string
  subject: string
  lessonTitle: string
  includeAnswerKey: boolean
}): Promise<Buffer> {
  const { branding, contentType, contentJson, studentName, subject, lessonTitle, includeAnswerKey } = params

  if (contentType === "worksheet") {
    const worksheet = contentJson as AdaptiveWorksheetOutput
    const doc = AdaptiveWorksheetPDFDocument({ branding, studentName, subject, lessonTitle, worksheet })
    return Buffer.from(await renderToBuffer(doc))
  }
  if (contentType === "quiz") {
    const quiz = contentJson as AdaptiveQuizOutput
    const doc = AdaptiveQuizPDFDocument({
      branding,
      studentName,
      subject,
      lessonTitle,
      quiz,
      includeAnswerKey,
    })
    return Buffer.from(await renderToBuffer(doc))
  }
  const activity = contentJson as AdaptiveActivityOutput
  const doc = AdaptiveActivityPDFDocument({ branding, studentName, subject, lessonTitle, activity })
  return Buffer.from(await renderToBuffer(doc))
}
