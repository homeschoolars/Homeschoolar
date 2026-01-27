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
  const [progress, assignments] = await Promise.all([
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

  const mappedChild = serializeChild(child)

  return <ChildDetailPageClient child={mappedChild} progress={progress} assignments={assignments} />
}
