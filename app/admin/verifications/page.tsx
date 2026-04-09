import { redirect } from "next/navigation"
import { auth } from "@/auth"
import GuardianVerificationsClient from "./verifications-client"

export default async function AdminGuardianVerificationsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "admin") redirect("/parent")

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold text-slate-900">Guardian verifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review death certificates submitted during onboarding (pending only).
        </p>
        <GuardianVerificationsClient />
      </div>
    </div>
  )
}
