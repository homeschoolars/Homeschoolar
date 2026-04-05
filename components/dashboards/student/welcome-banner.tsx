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
    <Card className="mb-6 overflow-hidden border-0 rounded-3xl shadow-[0_20px_50px_-12px_rgba(91,33,182,0.35)] ring-1 ring-white/20">
      <div className="bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 text-white">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-center gap-4">
                <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-2xl sm:text-3xl shadow-inner">
                  {child.avatar_url || "👧"}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-200/90 mb-1">
                    Student space
                  </p>
                  <h1 className="truncate text-xl font-bold sm:text-2xl font-[family-name:var(--font-heading)] tracking-tight">
                    Hi, {child.name}! 👋
                  </h1>
                  <p className="text-sm text-violet-100/95 sm:text-base mt-0.5">
                    {goalReached
                      ? "You hit your daily goal — outstanding!"
                      : remaining === 1
                        ? "One more activity to hit your daily goal!"
                        : "Ready for another focused day of learning?"}
                  </p>
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/95 border border-white/15 capitalize backdrop-blur-sm">
                  {child.current_level}
                </span>
                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/95 border border-white/15 backdrop-blur-sm">
                  Age {child.age_group}
                </span>
              </div>

              <div className="rounded-2xl bg-black/20 p-3 border border-white/10">
                <div className="mb-1.5 flex items-center justify-between text-xs text-violet-100/90">
                  <span>Level {level}</span>
                  <span className="tabular-nums">
                    {xpInLevel} / {xpTarget} XP
                  </span>
                </div>
                <Progress
                  value={xpPercent}
                  className="h-2.5 bg-white/15 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-fuchsia-400 [&_[data-slot=progress-indicator]]:to-violet-300"
                />
              </div>
            </div>

            <div className="flex w-full gap-2 sm:w-auto sm:flex-col sm:min-w-[120px]">
              <div className="flex-1 sm:flex-none rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-3 py-2.5 text-center">
                <div className="text-lg font-bold tabular-nums">🔥 {streak}</div>
                <div className="text-[11px] text-violet-100/85">day streak</div>
              </div>
              <div className="flex-1 sm:flex-none rounded-2xl bg-amber-500/25 backdrop-blur-md border border-amber-300/30 px-3 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-bold tabular-nums">
                  <Coins className="h-4 w-4 text-amber-200" /> {coins}
                </div>
                <div className="text-[11px] text-amber-100/90">coins</div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl bg-white p-3 sm:p-4 text-slate-800 shadow-lg">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Target className="h-4 w-4 text-violet-600 shrink-0" />
                <span className="text-sm font-bold text-slate-900 truncate">Daily goal</span>
              </div>
              <span className="text-sm font-bold text-violet-700 tabular-nums shrink-0">
                {dailyGoalProgress} / {dailyGoal}
              </span>
            </div>
            <Progress
              value={dailyGoal ? (dailyGoalProgress / dailyGoal) * 100 : 0}
              className="h-3 bg-violet-100 [&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-violet-500 [&_[data-slot=progress-indicator]]:to-fuchsia-500"
            />
            {!goalReached && remaining > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                {remaining} more {remaining === 1 ? "worksheet or quiz" : "activities"} to unlock today&apos;s reward!
              </p>
            )}
            {completedToday > 0 ? (
              <p className="mt-2 text-xs text-slate-600">
                You already completed {completedToday} {completedToday === 1 ? "activity" : "activities"} today.
              </p>
            ) : null}
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
