"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, ClipboardCheck } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export type ActivityItem = {
  id: string
  type: "worksheet" | "quiz"
  title: string
  subject: string
  date: string
  score?: number
  maxScore?: number
}

interface RecentActivitiesProps {
  activities: ActivityItem[]
  isLoading?: boolean
}

export function RecentActivities({ activities, isLoading }: RecentActivitiesProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium text-slate-900">Recent activities</CardTitle>
        <CardDescription>Videos watched, quizzes attempted</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-2">
            {activities.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">No recent activity yet.</p>
            ) : (
              activities.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      a.type === "quiz" ? "bg-violet-100 text-violet-600" : "bg-teal-100 text-teal-600"
                    }`}
                  >
                    {a.type === "quiz" ? (
                      <ClipboardCheck className="h-4 w-4" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {a.subject}
                      {a.score != null && a.maxScore != null && (
                        <span className="ml-1">
                          · {a.score}/{a.maxScore}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {formatDistanceToNow(new Date(a.date), { addSuffix: true })}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
