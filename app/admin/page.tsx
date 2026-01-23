import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { getAdminDashboardData } from "@/services/admin-service"
import { serializeProfile, serializeSubject, serializeWorksheet } from "@/lib/serializers"
import AdminDashboardClient from "./admin-dashboard-client"

export default async function AdminDashboard() {
  const session = await auth()
  const user = session?.user
  if (!user) {
    redirect("/login")
  }

  if (user.role !== "admin") {
    redirect("/parent")
  }

  const { usersCount, childrenCount, worksheetsCount, pendingWorksheets, recentUsers, subjects } =
    await getAdminDashboardData()

  return (
    <AdminDashboardClient
      stats={{
        usersCount,
        childrenCount,
        worksheetsCount,
      }}
      pendingWorksheets={pendingWorksheets.map(serializeWorksheet)}
      recentUsers={recentUsers.map(serializeProfile)}
      subjects={subjects.map(serializeSubject)}
    />
  )
}
