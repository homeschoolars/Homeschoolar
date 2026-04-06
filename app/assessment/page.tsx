import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AssessmentFlow } from "./assessment-flow"

export default async function AssessmentPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }
  if (session.user.role !== "parent") {
    redirect("/student")
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

  return <AssessmentFlow initialChildren={initialChildren} />
}
