"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Star } from "lucide-react"

export type AchievementItem = {
  id: string
  name: string
  description: string
  icon: string
  earned: boolean
  earnedAt?: string
}

const DEFAULT_ACHIEVEMENTS: AchievementItem[] = [
  { id: "first-worksheet", name: "First worksheet", description: "Complete your first worksheet", icon: "📝", earned: false },
  { id: "quiz-master", name: "Quiz master", description: "Complete a surprise quiz", icon: "🏆", earned: false },
  { id: "week-streak", name: "Week streak", description: "7 days in a row", icon: "🔥", earned: false },
  { id: "perfect-score", name: "Perfect score", description: "Score 100% on a worksheet", icon: "⭐", earned: false },
  { id: "subject-expert", name: "Subject expert", description: "Master a subject", icon: "🎓", earned: false },
]

interface AchievementsMilestonesProps {
  achievements?: AchievementItem[] | null
  worksheetsCompleted: number
  streak: number
  isLoading?: boolean
}

export function AchievementsMilestones({
  achievements = null,
  worksheetsCompleted,
  streak,
  isLoading,
}: AchievementsMilestonesProps) {
  const list = achievements?.length ? achievements : DEFAULT_ACHIEVEMENTS.map((a) => {
    let earned = a.earned
    if (a.id === "first-worksheet" && worksheetsCompleted >= 1) earned = true
    if (a.id === "week-streak" && streak >= 7) earned = true
    return { ...a, earned }
  })

  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium text-slate-900 flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-500" />
          Achievements & milestones
        </CardTitle>
        <CardDescription>Badges earned</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {list.map((a) => (
            <div
              key={a.id}
              className={`flex flex-col items-center rounded-lg border p-3 text-center ${
                a.earned ? "border-amber-200 bg-amber-50/80" : "border-slate-200 bg-slate-50/50 opacity-70"
              }`}
            >
              <span className={`text-2xl mb-1 ${!a.earned ? "grayscale" : ""}`}>{a.icon}</span>
              <p className="text-xs font-medium text-slate-800 truncate w-full">{a.name}</p>
              <p className="text-[10px] text-slate-500 truncate w-full">{a.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
