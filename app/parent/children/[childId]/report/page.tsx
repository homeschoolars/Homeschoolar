import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { stripHiddenFromStoredJson } from "@/lib/assessment/sanitize-report"
import type { AssessmentReportPublic } from "@/lib/assessment/types-ai"
import { isHolisticReportJson } from "@/lib/assessment/report-shape"
import { HolisticReportView } from "@/components/assessment/holistic-report-view"
import { ParentQuestionnaireReportView } from "@/components/assessment/parent-questionnaire-report-view"
import { Button } from "@/components/ui/button"

export default async function ParentLearningAssessmentReportPage({
  params,
}: {
  params: Promise<{ childId: string }>
}) {
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
    where: { childId },
    orderBy: { createdAt: "desc" },
  })

  if (!latest) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">No assessment report yet</h1>
        <p className="text-sm text-slate-600">
          When you complete the learning assessment for {child.name}, the full report will appear here.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-xl bg-[#7F77DD] hover:bg-[#6d65c9]">
            <Link href={`/assessment/${child.id}`}>Start learning assessment</Link>
          </Button>
          <Button variant="outline" asChild className="rounded-xl">
            <Link href={`/parent/child/${child.id}`}>View child details</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/parent">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  const rawReport = latest.report
  const scores = (latest.scores ?? {}) as Record<string, { pct?: number; total?: number; max?: number }>

  if (isHolisticReportJson(rawReport)) {
    const report = stripHiddenFromStoredJson(rawReport) as AssessmentReportPublic
    return (
      <div className="min-h-screen bg-[#f8f6ff]">
        <HolisticReportView childId={child.id} childName={child.name} age={latest.age} report={report} />
      </div>
    )
  }

  const reportObj =
    rawReport && typeof rawReport === "object" && !Array.isArray(rawReport)
      ? (rawReport as Record<string, unknown>)
      : {}

  return (
    <div className="min-h-screen bg-[#f8f6ff]">
      <ParentQuestionnaireReportView
        childId={child.id}
        childName={child.name}
        age={latest.age}
        completedAtIso={latest.createdAt.toISOString()}
        scores={scores}
        report={reportObj}
      />
    </div>
  )
}
