"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Flame, User, BookOpen, TrendingUp } from "lucide-react"
import type { Child } from "@/lib/types"

interface ChildOverviewCardProps {
  child: Child
  streak: number
  averageScore: number
  worksheetsCompleted: number
}

export function ChildOverviewCard({
  child,
  streak,
  averageScore,
  worksheetsCompleted,
}: ChildOverviewCardProps) {
  const overallProgress = worksheetsCompleted > 0 ? Math.min(100, Math.round(averageScore * 0.4 + worksheetsCompleted * 2)) : 0

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xl font-semibold text-slate-600">
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{child.name}</h2>
              <p className="text-sm text-slate-500">
                Age {child.age_group} · {child.current_level}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 border border-amber-200">
            <Flame className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">{streak} day streak</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <User className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Level</p>
              <p className="text-sm font-medium text-slate-900 capitalize">{child.current_level}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <BookOpen className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Worksheets</p>
              <p className="text-sm font-medium text-slate-900">{worksheetsCompleted}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <TrendingUp className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-xs text-slate-500">Avg. score</p>
              <p className="text-sm font-medium text-slate-900">{averageScore}%</p>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Overall progress</span>
            <span className="font-medium text-slate-700">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
