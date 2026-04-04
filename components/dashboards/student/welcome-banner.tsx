"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Coins, Target } from "lucide-react"
import type { Child } from "@/lib/types"

interface WelcomeBannerProps {
  child: Child
  completedToday: number
  dailyGoal?: number
  dailyGoalProgress?: number
  streak?: number
  coins?: number
  level?: number
  xpInLevel?: number
  xpToNextLevel?: number
}

export function WelcomeBanner({
  child,
  completedToday,
  dailyGoal = 3,
  dailyGoalProgress = 0,
  streak = 0,
  coins = 0,
  level = 1,
  xpInLevel = 0,
  xpToNextLevel = 100,
}: WelcomeBannerProps) {
  const goalReached = dailyGoalProgress >= dailyGoal
  const remaining = Math.max(0, dailyGoal - dailyGoalProgress)
  const xpTarget = Math.max(1, xpInLevel + xpToNextLevel)
  const xpPercent = Math.min(100, Math.round((xpInLevel / xpTarget) * 100))

  return (
    <Card className="mb-6 overflow-hidden border-0 bg-[#7F77DD] text-white">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#534AB7] text-2xl sm:h-16 sm:w-16 sm:text-3xl">
                {child.avatar_url || "👧"}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold sm:text-2xl">Hi, {child.name}! 👋</h1>
                <p className="text-sm text-violet-100 sm:text-base">
                  {goalReached
                    ? "You hit your daily goal! Amazing work!"
                    : remaining === 1
                      ? "1 more activity to hit your daily goal!"
                      : "Ready for another amazing day of learning?"}
                </p>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-[#534AB7] px-2 py-0.5 text-xs font-medium text-violet-100 capitalize">
                {child.current_level}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#534AB7] px-2 py-0.5 text-xs font-medium text-violet-100">
                Age {child.age_group}
              </span>
            </div>

            <div className="rounded-xl bg-[#6F67D5] p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-violet-100">
                <span>Level {level}</span>
                <span className="tabular-nums">
                  {xpInLevel} / {xpTarget} XP
                </span>
              </div>
              <Progress value={xpPercent} className="h-2.5 bg-[#534AB7]" />
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
            <div className="min-w-[110px] rounded-xl bg-[#534AB7] px-3 py-2 text-center">
              <div className="text-lg font-bold tabular-nums">🔥 {streak}</div>
              <div className="text-[11px] text-violet-100">day streak</div>
            </div>
            <div className="min-w-[110px] rounded-xl bg-amber-600 px-3 py-2 text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold tabular-nums">
                <Coins className="h-4 w-4" /> {coins}
              </div>
              <div className="text-[11px] text-amber-100">coins</div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-white/95 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-bold text-violet-800">Daily goal</span>
            </div>
            <span className="text-sm font-bold text-violet-700 tabular-nums">
              {dailyGoalProgress} / {dailyGoal} activities
            </span>
          </div>
          <Progress value={dailyGoal ? (dailyGoalProgress / dailyGoal) * 100 : 0} className="h-3 bg-violet-100" />
          {!goalReached && remaining > 0 && (
            <p className="mt-1.5 text-xs text-violet-600">
              {remaining} more {remaining === 1 ? "worksheet or quiz" : "activities"} to unlock today&apos;s reward!
            </p>
          )}
          {completedToday > 0 ? (
            <p className="mt-1.5 text-xs text-violet-700">You already completed {completedToday} activity today.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
