import { Suspense } from "react"
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

  const { profile, children, subjectsByAgeGroup, subscription } = await getParentDashboardData(user.id)
  const mappedProfile = profile ? serializeProfile(profile) : null
  const mappedChildren = children.map(serializeChild)
  const mappedSubjectsByAgeGroup = Object.fromEntries(
    Object.entries(subjectsByAgeGroup).map(([ageGroup, subjects]) => [ageGroup, subjects.map(serializeSubject)]),
  )
  const mappedSubscription = subscription ? serializeSubscription(subscription) : null

  const guardianOnboarding = profile
    ? {
        familyRole: profile.familyRole,
        fatherStatus: profile.fatherStatus,
        guardianVerificationStatus: profile.guardianVerificationStatus,
        eligibleForFreeEducation: profile.eligibleForFreeEducation,
      }
    : null

  return (
    <Suspense fallback={<div className="min-h-screen dashboard-parent-bg animate-pulse" />}>
      <ParentDashboardClient
        profile={mappedProfile}
        // eslint-disable-next-line react/no-children-prop
        children={mappedChildren}
        subjectsByAgeGroup={mappedSubjectsByAgeGroup}
        subscription={mappedSubscription}
        guardianOnboarding={guardianOnboarding}
      />
    </Suspense>
  )
}
