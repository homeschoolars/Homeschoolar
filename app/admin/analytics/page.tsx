import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { AdminAnalytics } from "@/components/analytics/admin-analytics"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Bell, Settings } from "lucide-react"

export default async function AdminAnalyticsPage() {
  const session = await auth()
  const user = session?.user
  if (!user) {
    redirect("/login")
  }

  if (user.role !== "admin") {
    redirect("/parent")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="HomeSchoolar Logo" width={40} height={40} className="rounded-lg" />
            <div>
              <span className="text-xl font-bold">HomeSchoolar</span>
              <span className="ml-2 text-xs bg-teal-500 px-2 py-0.5 rounded-full">Admin</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/admin" className="text-sm font-medium text-gray-300 hover:text-white">
              Dashboard
            </Link>
            <Link href="/admin/users" className="text-sm font-medium text-gray-300 hover:text-white">
              Users
            </Link>
            <Link href="/admin/worksheets" className="text-sm font-medium text-gray-300 hover:text-white">
              Worksheets
            </Link>
            <Link href="/admin/analytics" className="text-sm font-medium text-teal-400">
              Analytics
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Link>
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics & Reports</h1>
        <p className="text-gray-600 mb-8">Monitor platform performance and user engagement</p>

        <AdminAnalytics />
      </main>
    </div>
  )
}
