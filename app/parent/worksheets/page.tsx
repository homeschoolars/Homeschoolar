import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getParentDashboardData } from "@/services/parent-service"
import { serializeChild } from "@/lib/serializers"
import { prisma } from "@/lib/prisma"
import WorksheetsPageClient from "./worksheets-client"

export default async function WorksheetsPage() {
  const session = await auth()
  const user = session?.user
  if (!user) {
    redirect("/login")
  }

  const { children } = await getParentDashboardData(user.id)
  const mappedChildren = children.map(serializeChild)

  // Fetch all worksheet assignments for all children
  const assignmentsData = await prisma.worksheetAssignment.findMany({
    where: {
      childId: { in: children.map((c) => c.id) },
    },
    include: {
      worksheet: {
        include: {
          subject: true,
        },
      },
      child: true,
    },
    orderBy: { createdAt: "desc" },
  })

  // Map to match the expected type
  const assignments = assignmentsData.map((a) => ({
    id: a.id,
    status: a.status,
    assignedAt: a.createdAt, // Use createdAt as assignedAt
    dueDate: a.dueDate,
    worksheet: {
      id: a.worksheet.id,
      title: a.worksheet.title,
      subject: {
        name: a.worksheet.subject.name,
      },
    },
    child: {
      id: a.child.id,
      name: a.child.name,
    },
  }))

  return <WorksheetsPageClient children={mappedChildren} assignments={assignments} />
}
