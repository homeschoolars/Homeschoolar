"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Users,
  FileText,
  Settings,
  LogOut,
  Check,
  X,
  Eye,
  UserPlus,
  Sparkles,
  Bell,
  Banknote,
  CreditCard,
} from "lucide-react"
import type { Profile, Worksheet, Subject } from "@/lib/types"
import { WorksheetGenerator } from "@/components/ai/worksheet-generator"
import { PKRPaymentVerification } from "@/components/admin/pkr-payment-verification"
import { signOut } from "next-auth/react"
import { apiFetch } from "@/lib/api-client"
import { formatPrice, formatPricePKR } from "@/lib/subscription-plans"

interface AdminDashboardClientProps {
  stats: {
    usersCount: number
    childrenCount: number
    worksheetsCount: number
  }
  pendingWorksheets: Worksheet[]
  recentUsers: Profile[]
  subjects?: Subject[]
}

type AdminSubscription = {
  id: string
  user_id: string
  user_email: string | null
  user_name: string | null
  child_count: number
  plan_type: string
  status: string
  currency: string
  final_amount: number | null
  created_at: string
}

type TierSummary = Record<string, { count: number; revenue_usd: number; revenue_pkr: number }>
type OrphanQueueItem = {
  id: string
  child_id: string
  child_name: string
  parent_id: string
  parent_name: string
  document_type: string
  document_url: string
  created_at: string
}
type OrphanMetrics = {
  verified_count: number
}

export default function AdminDashboardClient({
  stats,
  pendingWorksheets: initialPending,
  recentUsers,
  subjects = [],
}: AdminDashboardClientProps) {
  const [pendingWorksheets, setPendingWorksheets] = useState(initialPending)
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([])
  const [tierSummary, setTierSummary] = useState<TierSummary>({})
  const [orphanQueue, setOrphanQueue] = useState<OrphanQueueItem[]>([])
  const [orphanMetrics, setOrphanMetrics] = useState<OrphanMetrics | null>(null)
  const router = useRouter()
  const handleApproveWorksheet = async (worksheetId: string) => {
    const response = await apiFetch(`/api/admin/worksheets/${worksheetId}`, {
      method: "PATCH",
    })
    if (response.ok) {
      setPendingWorksheets(pendingWorksheets.filter((w) => w.id !== worksheetId))
    }
  }

  const handleRejectWorksheet = async (worksheetId: string) => {
    const response = await apiFetch(`/api/admin/worksheets/${worksheetId}`, {
      method: "DELETE",
    })
    if (response.ok) {
      setPendingWorksheets(pendingWorksheets.filter((w) => w.id !== worksheetId))
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" })
    router.push("/login")
  }

  const loadSubscriptions = async () => {
    const response = await apiFetch("/api/admin/subscriptions", { method: "GET" })
    if (!response.ok) return
    const data = await response.json()
    setSubscriptions(data.subscriptions ?? [])
    setTierSummary(data.tier_summary ?? {})
  }

  const loadOrphanQueue = async () => {
    const response = await apiFetch("/api/admin/orphan/review", { method: "GET" })
    if (!response.ok) return
    const data = await response.json()
    setOrphanQueue(data.queue ?? [])
    setOrphanMetrics(data.metrics ?? null)
  }

  useEffect(() => {
    loadSubscriptions()
    loadOrphanQueue()
  }, [])

  const updateSubscription = async (id: string, payload: Record<string, unknown>) => {
    const response = await apiFetch(`/api/admin/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!response.ok) return
    await loadSubscriptions()
  }

  const handleCancelSubscription = async (id: string) => {
    await updateSubscription(id, { status: "cancelled" })
  }

  const handleOverrideSubscription = async (id: string, currency: string) => {
    const amountInput = window.prompt(
      `Enter new final amount in ${currency} minor units (e.g., cents or rupees):`,
    )
    if (!amountInput) return
    const amount = Number(amountInput)
    if (!Number.isFinite(amount) || amount <= 0) return
    await updateSubscription(id, { final_amount: Math.round(amount) })
  }

  const handleRefundSubscription = async (id: string) => {
    await apiFetch(`/api/admin/subscriptions/${id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Admin initiated refund" }),
    })
    await loadSubscriptions()
  }

  const handleReviewOrphan = async (verificationId: string, status: "approved" | "rejected") => {
    const rejectionReason =
      status === "rejected" ? window.prompt("Provide a rejection reason for the parent:") : undefined
    await apiFetch("/api/admin/orphan/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verificationId, status, rejectionReason }),
    })
    await loadOrphanQueue()
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
            <TabsTrigger value="subscriptions" className="flex items-center gap-1">
              <CreditCard className="w-4 h-4" /> Subscriptions
            </TabsTrigger>
            <TabsTrigger value="orphans" className="flex items-center gap-1">
              <Users className="w-4 h-4" /> Orphan Queue
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

          <TabsContent value="subscriptions">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Child Tier</CardTitle>
                  <CardDescription>Subscription counts and revenue totals per child count.</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(tierSummary).length === 0 ? (
                    <p className="text-sm text-gray-500">No subscription data available.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Child Count</TableHead>
                          <TableHead>Subscriptions</TableHead>
                          <TableHead>Revenue (USD)</TableHead>
                          <TableHead>Revenue (PKR)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(tierSummary).map(([tier, summary]) => (
                          <TableRow key={tier}>
                            <TableCell>{tier}</TableCell>
                            <TableCell>{summary.count}</TableCell>
                            <TableCell>{formatPrice(summary.revenue_usd)}</TableCell>
                            <TableCell>{formatPricePKR(summary.revenue_pkr)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscriptions</CardTitle>
                  <CardDescription>Manage subscriptions and overrides.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Children</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div className="text-sm font-medium">{sub.user_name || "Parent"}</div>
                            <div className="text-xs text-gray-500">{sub.user_email}</div>
                          </TableCell>
                          <TableCell>{sub.child_count}</TableCell>
                          <TableCell className="capitalize">{sub.plan_type}</TableCell>
                          <TableCell>
                            <Badge variant={sub.status === "active" ? "default" : "outline"}>{sub.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {sub.currency === "PKR"
                              ? formatPricePKR(sub.final_amount ?? 0)
                              : formatPrice(sub.final_amount ?? 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOverrideSubscription(sub.id, sub.currency)}
                              >
                                Override
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelSubscription(sub.id)}
                              >
                                Cancel
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleRefundSubscription(sub.id)}>
                                Refund
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orphans">
            <Card>
              <CardHeader>
                <CardTitle>Orphan Verification Queue</CardTitle>
                <CardDescription>
                  Approve or reject submitted documents. Verified students: {orphanMetrics?.verified_count ?? 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orphanQueue.length === 0 ? (
                  <p className="text-sm text-gray-500">No pending submissions.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Child</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orphanQueue.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.child_name}</TableCell>
                          <TableCell>{item.parent_name}</TableCell>
                          <TableCell className="capitalize">{item.document_type.replace("_", " ")}</TableCell>
                          <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(item.document_url, "_blank")}
                              >
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleReviewOrphan(item.id, "approved")}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600"
                                onClick={() => handleReviewOrphan(item.id, "rejected")}
                              >
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
