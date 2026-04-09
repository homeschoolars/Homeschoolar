import { redirect } from "next/navigation"
import { auth } from "@/auth"
import CurriculumAdminClient from "./curriculum-admin-client"

export default async function AdminCurriculumPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "admin") redirect("/parent")

  return (
    <div className="min-h-screen bg-slate-50">
      <CurriculumAdminClient />
    </div>
  )
}
