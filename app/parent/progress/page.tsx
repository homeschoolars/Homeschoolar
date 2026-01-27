import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getParentDashboardData } from "@/services/parent-service"
import { serializeChild, serializeSubject } from "@/lib/serializers"
import { ParentAnalytics } from "@/components/analytics/parent-analytics"

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Progress & Analytics</h1>
          <p className="text-gray-600 mt-1">Track your children's learning progress</p>
        </div>
        <ParentAnalytics children={mappedChildren} subjects={mappedSubjects} />
      </div>
    </div>
  )
}
