import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripHiddenFromStoredJson } from "@/lib/assessment/sanitize-report"
import type { AssessmentReportPublic } from "@/lib/assessment/types-ai"
import { HolisticReportView } from "@/components/assessment/holistic-report-view"

export default async function ParentHolisticReportPage({ params }: { params: Promise<{ childId: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role === "student") redirect("/student")
  if (session.user.role !== "parent") redirect("/parent")

  const { childId } = await params

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
    select: { id: true, name: true },
  })
  if (!child) notFound()

  const latest = await prisma.assessmentReport.findFirst({
    where: { childId, assessmentKind: "ai_holistic" },
    orderBy: { createdAt: "desc" },
  })
  if (!latest) {
    redirect("/parent")
  }

  const report = stripHiddenFromStoredJson(latest.report) as AssessmentReportPublic

  return (
    <div className="min-h-screen bg-[#f8f6ff]">
      <HolisticReportView childId={child.id} childName={child.name} age={latest.age} report={report} />
    </div>
  )
}
