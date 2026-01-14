import { type NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { WorksheetPDF, CurriculumPDF, AssessmentReportPDF, RecommendationsPDF } from "@/components/pdf/pdf-templates"

export async function POST(request: NextRequest) {
  try {
    const { pdfType, data, email, message, title } = await request.json()

    // Generate PDF buffer based on type
    let buffer: Buffer

    switch (pdfType) {
      case "worksheet":
        buffer = await renderToBuffer(WorksheetPDF({ worksheet: data.worksheet, childName: data.childName }))
        break
      case "answer-key":
        buffer = await renderToBuffer(WorksheetPDF({ worksheet: data.worksheet, includeAnswerKey: true }))
        break
      case "curriculum":
        buffer = await renderToBuffer(
          CurriculumPDF({ subjects: data.subjects, ageGroup: data.ageGroup, childName: data.childName }),
        )
        break
      case "assessment":
        buffer = await renderToBuffer(
          AssessmentReportPDF({
            child: data.child,
            progress: data.progress,
            assessments: data.assessments,
            subjects: data.subjects,
          }),
        )
        break
      case "recommendations":
        buffer = await renderToBuffer(
          RecommendationsPDF({ childName: data.childName, recommendations: data.recommendations }),
        )
        break
      default:
        return NextResponse.json({ error: "Invalid PDF type" }, { status: 400 })
    }

    console.log(`Sending email to ${email} with PDF attachment: ${title}`)
    console.log(`Message: ${message}`)
    console.log(`PDF buffer size: ${buffer.length} bytes`)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // TODO: Integrate with actual email service
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // await resend.emails.send({
    //   from: 'HomeSchoolar <noreply@homeschoolar.app>',
    //   to: email,
    //   subject: `HomeSchoolar: ${title}`,
    //   html: `<p>${message || 'Please find attached your document from HomeSchoolar.'}</p>`,
    //   attachments: [{
    //     filename: `${title.replace(/\s+/g, '-').toLowerCase()}.pdf`,
    //     content: buffer,
    //   }],
    // })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sharing via email:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
