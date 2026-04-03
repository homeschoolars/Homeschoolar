import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { CurriculumManagement } from "@/components/admin/curriculum-management"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"

export default async function AdminCurriculumPage() {
  const session = await auth()
  const user = session?.user

  if (!user) {
    redirect("/login")
  }
  if (user.role !== "admin") {
    redirect("/parent")
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/admin">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Admin Dashboard
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Curriculum Admin</h1>
          <p className="text-sm text-slate-600">Manage structured curriculum for all age groups from a single UI.</p>
        </div>
        <CurriculumManagement />
      </div>
    </div>
  )
}
