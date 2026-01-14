import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import AdminDashboardClient from "./admin-dashboard-client"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/login")
  }

  // Check if user is admin
  const role = user.user_metadata?.role
  if (role !== "admin") {
    redirect("/parent")
  }

  // Fetch all users count
  const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true })

  // Fetch all children count
  const { count: childrenCount } = await supabase.from("children").select("*", { count: "exact", head: true })

  // Fetch worksheets count
  const { count: worksheetsCount } = await supabase.from("worksheets").select("*", { count: "exact", head: true })

  // Fetch pending worksheets
  const { data: pendingWorksheets } = await supabase
    .from("worksheets")
    .select("*")
    .eq("is_approved", false)
    .order("created_at", { ascending: false })
    .limit(10)

  // Fetch recent users
  const { data: recentUsers } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10)

  const { data: subjects } = await supabase.from("subjects").select("*").order("display_order")

  return (
    <AdminDashboardClient
      user={user}
      stats={{
        usersCount: usersCount || 0,
        childrenCount: childrenCount || 0,
        worksheetsCount: worksheetsCount || 0,
      }}
      pendingWorksheets={pendingWorksheets || []}
      recentUsers={recentUsers || []}
      subjects={subjects || []}
    />
  )
}
