import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getParentDashboardData } from "@/services/parent-service"
import { serializeChild, serializeProfile, serializeSubject, serializeSubscription } from "@/lib/serializers"
import ParentDashboardClient from "./parent-dashboard-client"

export default async function ParentDashboard() {
  const session = await auth()
  const user = session?.user
  if (!user) {
    redirect("/login")
  }

  const { profile, children, subjects, subscription } = await getParentDashboardData(user.id)
  const mappedProfile = profile ? serializeProfile(profile) : null
  const mappedChildren = children.map(serializeChild)
  const mappedSubjects = subjects.map(serializeSubject)
  const mappedSubscription = subscription ? serializeSubscription(subscription) : null

  return (
    <ParentDashboardClient
      profile={mappedProfile}
      children={mappedChildren}
      subjects={mappedSubjects}
      subscription={mappedSubscription}
    />
  )
}
