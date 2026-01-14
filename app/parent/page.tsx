import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ParentDashboardClient from "./parent-dashboard-client"

export default async function ParentDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/login")
  }

  // Fetch profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  // Fetch children
  const { data: children } = await supabase.from("children").select("*").eq("parent_id", user.id).order("created_at")

  // Fetch subjects
  const { data: subjects } = await supabase.from("subjects").select("*").order("display_order")

  // Fetch subscription
  const { data: subscription } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle()

  return (
    <ParentDashboardClient
      user={user}
      profile={profile}
      children={children || []}
      subjects={subjects || []}
      subscription={subscription}
    />
  )
}
