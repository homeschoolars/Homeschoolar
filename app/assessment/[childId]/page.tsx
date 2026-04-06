import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { AIReportPayload } from "@/components/assessment/AssessmentReport"
import type { SubjectScore } from "@/lib/assessment/types"
import { AssessmentFlow } from "../assessment-flow"

export default async function AssessmentForChildPage({
  params,
  searchParams,
}: {
  params: Promise<{ childId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }
  if (session.user.role !== "parent") {
    redirect("/student")
  }

  const { childId } = await params
  const sp = await searchParams
  const retakeRaw = sp.retake
  const isRetake = retakeRaw === "true" || (Array.isArray(retakeRaw) && retakeRaw[0] === "true")

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
    select: { id: true },
  })
  if (!child) {
    notFound()
  }

  const children = await prisma.child.findMany({
    where: { parentId: session.user.id },
    select: {
      id: true,
      name: true,
      profile: { select: { ageYears: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const initialChildren = children.map((c) => ({
    id: c.id,
    name: c.name,
    ageYears: c.profile?.ageYears ?? null,
  }))

  const latest = isRetake
    ? null
    : await prisma.assessmentReport.findFirst({
        where: { childId: child.id },
        orderBy: { createdAt: "desc" },
      })

  const existingReport =
    latest && !isRetake
      ? {
          id: latest.id,
          scores: latest.scores as Record<string, SubjectScore>,
          report: latest.report as unknown as AIReportPayload,
        }
      : null

  return (
    <AssessmentFlow
      key={`${child.id}-${isRetake ? "r" : "v"}-${existingReport?.id ?? "none"}`}
      routeChildId={child.id}
      initialChildren={initialChildren}
      existingReport={existingReport}
      isRetake={isRetake}
    />
  )
}
