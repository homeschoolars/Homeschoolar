"use client"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Users, FileText, Settings, LogOut, Check, X, Eye, UserPlus, Sparkles, Bell, Banknote } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { Profile, Worksheet, Subject } from "@/lib/types"
import { WorksheetGenerator } from "@/components/ai/worksheet-generator"
import { PKRPaymentVerification } from "@/components/admin/pkr-payment-verification"

interface AdminDashboardClientProps {
  user: User
  stats: {
    usersCount: number
    childrenCount: number
    worksheetsCount: number
  }
  pendingWorksheets: Worksheet[]
  recentUsers: Profile[]
  subjects?: Subject[]
}

export default function AdminDashboardClient({
  user,
  stats,
  pendingWorksheets: initialPending,
  recentUsers,
  subjects = [],
}: AdminDashboardClientProps) {
  const [pendingWorksheets, setPendingWorksheets] = useState(initialPending)
  const router = useRouter()
  const supabase = createBrowserClient()

  const handleApproveWorksheet = async (worksheetId: string) => {
    const { error } = await supabase.from("worksheets").update({ is_approved: true }).eq("id", worksheetId)

    if (!error) {
      setPendingWorksheets(pendingWorksheets.filter((w) => w.id !== worksheetId))
    }
  }

  const handleRejectWorksheet = async (worksheetId: string) => {
    const { error } = await supabase.from("worksheets").delete().eq("id", worksheetId)

    if (!error) {
      setPendingWorksheets(pendingWorksheets.filter((w) => w.id !== worksheetId))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-slate-50">
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
            <Link href="/admin" className="text-sm font-medium text-teal-400">
              Dashboard
            </Link>
            <Link href="/admin/users" className="text-sm font-medium text-gray-300 hover:text-white">
              Users
            </Link>
            <Link href="/admin/worksheets" className="text-sm font-medium text-gray-300 hover:text-white">
              Worksheets
            </Link>
            <Link href="/admin/analytics" className="text-sm font-medium text-gray-300 hover:text-white">
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
            <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users, content, and monitor platform activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-sm">Total Users</p>
                  <p className="text-3xl font-bold">{stats.usersCount}</p>
                </div>
                <Users className="w-10 h-10 text-teal-200" />
              </div>
              <p className="text-teal-100 text-xs mt-2">+12% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Students</p>
                  <p className="text-3xl font-bold">{stats.childrenCount}</p>
                </div>
                <UserPlus className="w-10 h-10 text-purple-200" />
              </div>
              <p className="text-purple-100 text-xs mt-2">+8% from last month</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm">Worksheets</p>
                  <p className="text-3xl font-bold">{stats.worksheetsCount}</p>
                </div>
                <FileText className="w-10 h-10 text-amber-200" />
              </div>
              <p className="text-amber-100 text-xs mt-2">{pendingWorksheets.length} pending approval</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-sm">AI Generated</p>
                  <p className="text-3xl font-bold">{stats.worksheetsCount}</p>
                </div>
                <Sparkles className="w-10 h-10 text-pink-200" />
              </div>
              <p className="text-pink-100 text-xs mt-2">This month</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> Generate Worksheets
            </TabsTrigger>
            <TabsTrigger value="pkr-payments" className="flex items-center gap-1">
              <Banknote className="w-4 h-4" /> PKR Payments
            </TabsTrigger>
            <TabsTrigger value="users">Recent Users</TabsTrigger>
          </TabsList>

          <TabsContent value="approvals">
            {/* Pending Approvals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" /> Pending Worksheet Approvals
                </CardTitle>
                <CardDescription>Review and approve AI-generated or user-submitted worksheets</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingWorksheets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Age Group</TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingWorksheets.map((worksheet) => (
                        <TableRow key={worksheet.id}>
                          <TableCell className="font-medium">{worksheet.title}</TableCell>
                          <TableCell>{worksheet.age_group}</TableCell>
                          <TableCell className="capitalize">{worksheet.difficulty}</TableCell>
                          <TableCell>
                            {worksheet.is_ai_generated ? (
                              <Badge className="bg-purple-100 text-purple-700">AI Generated</Badge>
                            ) : (
                              <Badge variant="outline">Manual</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleApproveWorksheet(worksheet.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleRejectWorksheet(worksheet.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Check className="w-12 h-12 mx-auto text-green-500 mb-2" />
                    <p>All worksheets have been reviewed!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate">
            <div className="max-w-xl">
              <WorksheetGenerator
                subjects={subjects}
                onGenerated={(worksheet) => {
                  setPendingWorksheets([...pendingWorksheets, worksheet])
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="pkr-payments">
            <PKRPaymentVerification />
          </TabsContent>

          <TabsContent value="users">
            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" /> Recent Users
                </CardTitle>
                <CardDescription>Newly registered accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentUsers.length > 0 ? (
                    recentUsers.map((profile) => (
                      <div key={profile.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 flex items-center justify-center text-white font-medium">
                          {profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{profile.full_name || "No name"}</p>
                          <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                        </div>
                        <Badge variant={profile.role === "admin" ? "default" : "secondary"}>{profile.role}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">No users yet</p>
                  )}
                </div>
                <Button variant="outline" className="w-full mt-4 bg-transparent" asChild>
                  <Link href="/admin/users">View All Users</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
