import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getParentDashboardData } from "@/services/parent-service"
import { serializeChild, serializeSubject } from "@/lib/serializers"
import { ParentAnalytics } from "@/components/analytics/parent-analytics"
import { ParentPageShell } from "@/components/layout/parent-page-shell"

export default async function ProgressPage() {
  const session = await auth()
  const user = session?.user
  if (!user) {
    redirect("/login")
  }

  const { children, subjects } = await getParentDashboardData(user.id)
  const mappedChildren = children.map(serializeChild)
  const mappedSubjects = subjects.map(serializeSubject)

  return (
    <ParentPageShell
      title="Progress & Analytics"
      subtitle="Track your children's learning progress"
      activeNav="progress"
    >
        {/* eslint-disable-next-line react/no-children-prop */}
        <ParentAnalytics children={mappedChildren} subjects={mappedSubjects} />
    </ParentPageShell>
  )
}
