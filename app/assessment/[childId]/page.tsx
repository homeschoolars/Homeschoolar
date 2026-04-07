import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { toApiAgeGroup } from "@/lib/age-group"
import { syncChildAgeGroupFromProfile } from "@/lib/child-age-sync"
import { calculateAgeYears } from "@/lib/onboarding-utils"
import { getLearningClassFromAgeYears, getLearningClassLabelFromApiAgeGroup } from "@/lib/learning-class"
import { needsParentPasswordForHolisticAssessment } from "@/lib/assessment/parent-gate"
import { AssessmentFlow } from "../assessment-flow"
import { ParentAppHeader } from "@/components/layout/parent-app-header"
import { Button } from "@/components/ui/button"

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

  await syncChildAgeGroupFromProfile(childId)

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
    select: {
      id: true,
      name: true,
      assessmentCompleted: true,
      firstStudentLoginAt: true,
      ageGroup: true,
      profile: { select: { dateOfBirth: true, ageYears: true } },
    },
  })
  if (!child) {
    notFound()
  }

  if (child.assessmentCompleted && !isRetake) {
    redirect(`/parent?focusAssessment=${encodeURIComponent(child.id)}`)
  }

  if (!child.assessmentCompleted && !child.firstStudentLoginAt && !isRetake) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-violet-50/80 to-white">
        <ParentAppHeader active="dashboard" />
        <div className="container mx-auto max-w-lg px-4 py-12 text-center">
          <h1 className="text-xl font-bold text-slate-900 font-[family-name:var(--font-heading)] mb-3">
            Learning assessment unlocks after first student sign-in
          </h1>
          <p className="text-slate-600 leading-relaxed mb-6">
            Have <span className="font-semibold text-slate-800">{child.name}</span> sign in once using their student
            code from the login page. After that, you can complete the holistic learning assessment here. The detailed
            report stays on your parent dashboard only — not on the student account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="rounded-xl bg-violet-600 hover:bg-violet-700">
              <Link href="/login">Open student login</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/parent">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    )
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

  const apiAge = toApiAgeGroup(child.ageGroup)
  const learningClass =
    child.profile?.dateOfBirth != null
      ? getLearningClassFromAgeYears(calculateAgeYears(child.profile.dateOfBirth))
      : getLearningClassLabelFromApiAgeGroup(apiAge)
  const requiresPasswordBeforeQuiz = needsParentPasswordForHolisticAssessment(learningClass.key)

  return (
    <AssessmentFlow
      key={`${child.id}-${isRetake ? "r" : "n"}-v3`}
      routeChildId={child.id}
      routeChildName={child.name}
      routeChildLearningClassLabel={learningClass.label}
      initialChildren={initialChildren}
      isRetake={isRetake}
      requiresPasswordBeforeQuiz={requiresPasswordBeforeQuiz}
    />
  )
}
