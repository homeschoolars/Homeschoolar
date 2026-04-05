"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Trophy, Lock } from "lucide-react"
import confetti from "canvas-confetti"

const BADGES = [
  { id: "first", icon: "🌟", title: "First Star", desc: "Complete your first worksheet", minWorksheets: 1, xp: 10 },
  { id: "streak3", icon: "🔥", title: "On Fire!", desc: "3-day learning streak", minStreak: 3, xp: 15 },
  { id: "bookworm", icon: "📚", title: "Bookworm", desc: "Complete 10 worksheets", minWorksheets: 10, xp: 25 },
  { id: "streak7", icon: "⭐", title: "Week Warrior", desc: "7-day learning streak", minStreak: 7, xp: 30 },
  { id: "champion", icon: "🏆", title: "Champion", desc: "Score 100% on a worksheet", minPerfect: 1, xp: 20 },
  { id: "quizzer", icon: "🧩", title: "Quiz Master", desc: "Pass 5 quizzes", minQuizzes: 5, xp: 25 },
  { id: "streak14", icon: "💎", title: "Diamond Streak", desc: "14-day learning streak", minStreak: 14, xp: 50 },
  { id: "legend", icon: "👑", title: "Legend", desc: "Complete 50 worksheets", minWorksheets: 50, xp: 100 },
]

interface AchievementsGridProps {
  worksheetsCompleted: number
  streak: number
  quizCount?: number
  perfectScores?: number
  hasFirstLessonCompleted?: boolean
}

export function AchievementsGrid({
  worksheetsCompleted,
  streak,
  quizCount = 0,
  perfectScores = 0,
  hasFirstLessonCompleted = false,
}: AchievementsGridProps) {
  const triggerCelebration = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 },
      colors: ["#fbbf24", "#a855f7", "#ec4899", "#06b6d4"],
    })
  }

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25 ring-1 ring-white/25">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-[family-name:var(--font-heading)] tracking-tight">
            Achievements
          </h2>
          <p className="text-sm text-slate-600">Unlock badges and earn rewards.</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {BADGES.map((b) => {
          const unlocked =
            hasFirstLessonCompleted &&
            ((b.minWorksheets != null && worksheetsCompleted >= b.minWorksheets) ||
              (b.minStreak != null && streak >= b.minStreak) ||
              (b.minQuizzes != null && quizCount >= b.minQuizzes) ||
              (b.minPerfect != null && perfectScores >= b.minPerfect))

          return (
            <Card
              key={b.id}
              className={`rounded-2xl border text-center transition-all touch-manipulation cursor-default ${
                unlocked
                  ? "border-amber-300/90 bg-gradient-to-br from-amber-50 to-yellow-50/90 hover:border-amber-400 hover:shadow-lg shadow-md shadow-amber-500/10"
                  : "border-slate-200/80 bg-slate-50/90 opacity-85"
              }`}
              onClick={unlocked ? triggerCelebration : undefined}
            >
              <CardContent className="p-4">
                <div className="relative inline-block mb-2">
                  <span
                    className={`text-3xl sm:text-4xl block transition-transform ${!unlocked ? "grayscale opacity-50" : "hover:scale-110"}`}
                  >
                    {b.icon}
                  </span>
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                </div>
                <h3 className={`font-bold text-sm ${unlocked ? "text-violet-800" : "text-slate-500"}`}>
                  {b.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{b.desc}</p>
                {unlocked && b.xp != null && (
                  <p className="text-xs font-medium text-amber-700 mt-1">+{b.xp} XP</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      {!hasFirstLessonCompleted && (
        <p className="mt-3 text-sm text-slate-600">Complete your first lesson to unlock badge rewards.</p>
      )}
    </section>
  )
}
