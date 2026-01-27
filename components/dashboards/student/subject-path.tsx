"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import {
  BookOpen,
  Calculator,
  FlaskConical,
  Globe,
  Heart,
  Users,
  Smile,
  Activity,
  PiggyBank,
  Star,
  ChevronRight,
} from "lucide-react"
import type { Subject } from "@/lib/types"
import type { Progress as ProgressType } from "@/lib/types"

const subjectIcons: Record<string, React.ReactNode> = {
  "book-open": <BookOpen className="h-5 w-5" />,
  calculator: <Calculator className="h-5 w-5" />,
  flask: <FlaskConical className="h-5 w-5" />,
  globe: <Globe className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
  smile: <Smile className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
  "piggy-bank": <PiggyBank className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
}

interface SubjectPathProps {
  subjects: Subject[]
  progress: ProgressType[]
}

export function SubjectPath({ subjects, progress }: SubjectPathProps) {
  const getProgress = (subjectId: string) => {
    const p = progress.find((r) => r.subject_id === subjectId)
    const total = p?.total_worksheets ?? 0
    const completed = p?.completed_worksheets ?? 0
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    return { total, completed, pct }
  }

  const nextSubjectId = (() => {
    for (const s of subjects) {
      const { completed, total } = getProgress(s.id)
      if (total > 0 && completed < total) return s.id
    }
    return subjects[0]?.id ?? null
  })()

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-violet-800">Your learning path</h2>
          <p className="text-sm text-violet-600">Continue where you left off</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => {
          const { total, completed, pct } = getProgress(subject.id)
          const isNext = subject.id === nextSubjectId
          const color = subject.color || "#8b5cf6"
          const icon = subjectIcons[subject.icon || "book-open"] || subjectIcons["book-open"]

          return (
            <Link href={`/student/subject/${subject.id}`} key={subject.id} className="block group">
              <Card
                className={`h-full border-[3px] transition-all overflow-hidden hover:scale-[1.02] ${
                  isNext
                    ? "border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 shadow-lg shadow-amber-200/40 ring-2 ring-amber-300/50"
                    : "border-violet-200 hover:border-violet-400 hover:shadow-lg bg-white"
                }`}
                style={!isNext ? { borderColor: `${color}40` } : undefined}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  >
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-violet-900 truncate">
                        {subject.name.split("(")[0].trim()}
                      </p>
                      {isNext && (
                        <span className="shrink-0 text-xs font-bold text-amber-700 bg-amber-200/90 px-2 py-0.5 rounded-full border border-amber-300">
                          Next up
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={pct} className="h-2 flex-1 bg-violet-100" />
                      <span className="text-xs text-slate-500 tabular-nums shrink-0">
                        {completed}/{total}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 shrink-0 group-hover:translate-x-0.5 transition-transform ${
                      isNext ? "text-amber-600" : "text-violet-400"
                    }`}
                  />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
