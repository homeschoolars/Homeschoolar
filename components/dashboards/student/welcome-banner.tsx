"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Flame, Target } from "lucide-react"
import type { Child } from "@/lib/types"

interface WelcomeBannerProps {
  child: Child
  completedToday: number
  dailyGoal?: number
  dailyGoalProgress?: number
  streak?: number
}

export function WelcomeBanner({
  child,
  completedToday,
  dailyGoal = 3,
  dailyGoalProgress = 0,
  streak = 0,
}: WelcomeBannerProps) {
  const goalReached = dailyGoalProgress >= dailyGoal
  const remaining = Math.max(0, dailyGoal - dailyGoalProgress)

  return (
    <Card className="mb-6 border-[3px] border-violet-300 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50 overflow-hidden relative">
      <div className="absolute top-2 right-3 sm:right-4 text-4xl sm:text-5xl select-none opacity-90">
        {goalReached ? "🎉" : "✨"}
      </div>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-2xl sm:text-3xl border-4 border-white shadow-lg shrink-0 ring-2 ring-violet-200/50">
            {child.avatar_url || "👧"}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-violet-900">Hi, {child.name}! 👋</h1>
            <p className="text-violet-700 text-sm sm:text-base">
              {goalReached
                ? "You hit your daily goal! Amazing work!"
                : remaining === 1
                  ? "1 more activity to hit your daily goal!"
                  : "Ready for another amazing day of learning?"}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="inline-flex items-center rounded-full bg-violet-200/90 px-2 py-0.5 text-xs font-medium text-violet-800 border border-violet-300 capitalize">
                {child.current_level}
              </span>
              <span className="inline-flex items-center rounded-full bg-slate-200/90 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-300">
                Age {child.age_group}
              </span>
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-200/90 px-2 py-0.5 text-xs font-medium text-orange-800 border border-orange-300">
                  <Flame className="h-3 w-3 fill-orange-500 text-orange-500" />
                  {streak} day streak!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Daily goal — Duolingo-style */}
        <div className="rounded-xl bg-white/80 border-2 border-violet-200/80 p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-bold text-violet-800">Daily goal</span>
            </div>
            <span className="text-sm font-bold text-violet-700 tabular-nums">
              {dailyGoalProgress} / {dailyGoal} activities
            </span>
          </div>
          <Progress
            value={dailyGoal ? (dailyGoalProgress / dailyGoal) * 100 : 0}
            className="h-3 bg-violet-100"
          />
          {!goalReached && remaining > 0 && (
            <p className="text-xs text-violet-600 mt-1.5">
              {remaining} more {remaining === 1 ? "worksheet or quiz" : "activities"} to unlock today&apos;s reward!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
