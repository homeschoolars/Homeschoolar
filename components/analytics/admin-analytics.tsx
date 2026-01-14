"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Users, DollarSign, FileText, TrendingUp, Sparkles, BookOpen } from "lucide-react"

const COLORS = ["#14b8a6", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6"]

interface Stats {
  totalUsers: number
  activeSubscribers: number
  totalRevenue: number
  worksheetsGenerated: number
  quizzesTaken: number
  avgCompletionRate: number
}

export function AdminAnalytics() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeSubscribers: 0,
    totalRevenue: 0,
    worksheetsGenerated: 0,
    quizzesTaken: 0,
    avgCompletionRate: 0,
  })
  const [timeRange, setTimeRange] = useState("30d")
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Mock data for charts - in production, fetch from database
  const userGrowthData = [
    { date: "Jan", users: 120, subscribers: 45 },
    { date: "Feb", users: 180, subscribers: 72 },
    { date: "Mar", users: 250, subscribers: 98 },
    { date: "Apr", users: 340, subscribers: 145 },
    { date: "May", users: 420, subscribers: 189 },
    { date: "Jun", users: 520, subscribers: 234 },
  ]

  const revenueData = [
    { date: "Jan", revenue: 2400 },
    { date: "Feb", revenue: 3800 },
    { date: "Mar", revenue: 5200 },
    { date: "Apr", revenue: 7600 },
    { date: "May", revenue: 9800 },
    { date: "Jun", revenue: 12400 },
  ]

  const planDistribution = [
    { name: "Trial", value: 35, color: "#f59e0b" },
    { name: "Monthly", value: 45, color: "#14b8a6" },
    { name: "Yearly", value: 20, color: "#8b5cf6" },
  ]

  const subjectEngagement = [
    { subject: "English", completed: 450, started: 520 },
    { subject: "Math", completed: 380, started: 450 },
    { subject: "Science", completed: 320, started: 400 },
    { subject: "Social Studies", completed: 280, started: 350 },
    { subject: "Islamic Studies", completed: 420, started: 480 },
  ]

  const aiUsageData = [
    { date: "Mon", worksheets: 45, quizzes: 23, recommendations: 67 },
    { date: "Tue", worksheets: 52, quizzes: 31, recommendations: 78 },
    { date: "Wed", worksheets: 48, quizzes: 28, recommendations: 72 },
    { date: "Thu", worksheets: 61, quizzes: 35, recommendations: 89 },
    { date: "Fri", worksheets: 55, quizzes: 29, recommendations: 82 },
    { date: "Sat", worksheets: 38, quizzes: 18, recommendations: 54 },
    { date: "Sun", worksheets: 42, quizzes: 21, recommendations: 61 },
  ]

  useEffect(() => {
    fetchStats()
  }, [timeRange])

  const fetchStats = async () => {
    setIsLoading(true)

    // Fetch actual counts from database
    const [{ count: usersCount }, { count: subscribersCount }, { count: worksheetsCount }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("worksheets").select("*", { count: "exact", head: true }),
    ])

    setStats({
      totalUsers: usersCount || 0,
      activeSubscribers: subscribersCount || 0,
      totalRevenue: 12400, // Would come from payments table
      worksheetsGenerated: worksheetsCount || 0,
      quizzesTaken: 156,
      avgCompletionRate: 78,
    })

    setIsLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeSubscribers}</p>
                <p className="text-xs text-gray-500">Subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">${(stats.totalRevenue / 100).toFixed(0)}</p>
                <p className="text-xs text-gray-500">Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.worksheetsGenerated}</p>
                <p className="text-xs text-gray-500">Worksheets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.quizzesTaken}</p>
                <p className="text-xs text-gray-500">Quizzes Taken</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgCompletionRate}%</p>
                <p className="text-xs text-gray-500">Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Growth</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="ai">AI Usage</TabsTrigger>
          <TabsTrigger value="subjects">Subject Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>User & Subscriber Growth</CardTitle>
                <CardDescription>Monthly growth trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={userGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="users" stroke="#14b8a6" strokeWidth={2} name="Total Users" />
                      <Line type="monotone" dataKey="subscribers" stroke="#8b5cf6" strokeWidth={2} name="Subscribers" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Active subscription breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {planDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly recurring revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                    <Bar dataKey="revenue" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Feature Usage</CardTitle>
              <CardDescription>Daily AI interactions this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aiUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="worksheets" fill="#14b8a6" name="Worksheets Generated" />
                    <Bar dataKey="quizzes" fill="#8b5cf6" name="Quizzes Taken" />
                    <Bar dataKey="recommendations" fill="#f59e0b" name="Recommendations" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Subject Engagement</CardTitle>
              <CardDescription>Worksheets started vs completed by subject</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectEngagement} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="subject" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="started" fill="#e0e7ff" name="Started" />
                    <Bar dataKey="completed" fill="#14b8a6" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
