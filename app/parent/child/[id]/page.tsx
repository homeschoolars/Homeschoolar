import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { serializeChild } from "@/lib/serializers"
import { enforceParentChildAccess } from "@/lib/auth-helpers"
import ChildDetailPageClient from "./child-detail-client"

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const user = session?.user
  if (!user) {
    redirect("/login")
  }

  const { id: childId } = await params

  // Verify access
  try {
    await enforceParentChildAccess(childId, session)
  } catch {
    notFound()
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
  })

  if (!child) {
    notFound()
  }

  // Fetch related data separately
  const [progressData, assignmentsData] = await Promise.all([
    prisma.progress.findMany({
      where: { childId },
      include: {
        subject: true,
      },
    }),
    prisma.worksheetAssignment.findMany({
      where: { childId },
      include: {
        worksheet: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ])

  // Map progress to match expected type (convert Decimal to number)
  const progress = progressData.map((p) => ({
    id: p.id,
    averageScore: Number(p.averageScore),
    completedWorksheets: p.completedWorksheets,
    subject: {
      name: p.subject.name,
    },
  }))

  // Map assignments to match expected type
  const assignments = assignmentsData.map((a) => ({
    id: a.id,
    status: a.status,
    assignedAt: a.createdAt, // Use createdAt as assignedAt
    worksheet: {
      title: a.worksheet.title,
      subject: {
        name: a.worksheet.subject.name,
      },
    },
  }))

  const mappedChild = serializeChild(child)

  return <ChildDetailPageClient child={mappedChild} progress={progress} assignments={assignments} />
}
