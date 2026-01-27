"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Users, UserPlus, FileText, Sparkles } from "lucide-react"
import { SystemHealth } from "./system-health"
import { AIUsageMonitor } from "./ai-usage-monitor"
import { apiFetch } from "@/lib/api-client"

type Stats = {
  totalUsers: number
  activeSubscribers: number
  worksheetsGenerated: number
  quizzesTaken: number
  totalRevenue: number
  avgCompletionRate: number
}

interface AdminOverviewProps {
  usersCount: number
  childrenCount: number
  worksheetsCount: number
}

export function AdminOverview({
  usersCount,
  childrenCount,
  worksheetsCount,
}: AdminOverviewProps) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    apiFetch("/api/admin/analytics?range=30d")
      .then((r) => r.json())
      .then((d: { stats?: Stats }) => setStats(d.stats ?? null))
      .catch(() => setStats(null))
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{usersCount}</p>
              <p className="text-xs text-slate-500">Users</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{childrenCount}</p>
              <p className="text-xs text-slate-500">Students</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{worksheetsCount}</p>
              <p className="text-xs text-slate-500">Worksheets</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats?.activeSubscribers ?? "—"}</p>
              <p className="text-xs text-slate-500">Active subs</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SystemHealth />
        <AIUsageMonitor />
      </div>
    </div>
  )
}
