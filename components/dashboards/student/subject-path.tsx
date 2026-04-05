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

const brandPalette = ["#7F77DD", "#1D9E75", "#378ADD", "#BA7517", "#D4537E", "#534AB7"]

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
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/25">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-[family-name:var(--font-heading)] tracking-tight">
            Your learning path
          </h2>
          <p className="text-sm text-slate-600">Continue where you left off</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => {
          const { total, completed, pct } = getProgress(subject.id)
          const isNext = subject.id === nextSubjectId
          const color = subject.color || brandPalette[subjects.findIndex((s) => s.id === subject.id) % brandPalette.length]
          const icon = subjectIcons[subject.icon || "book-open"] || subjectIcons["book-open"]

          return (
            <Link href={`/student/subject/${subject.id}`} key={subject.id} className="block group">
              <Card
                className={`h-full rounded-3xl border-2 transition-all overflow-hidden hover:scale-[1.01] hover:shadow-xl ${
                  isNext
                    ? "border-amber-300 shadow-xl ring-2 ring-amber-200/60"
                    : "border-white/30 hover:shadow-lg"
                }`}
                style={{
                  borderColor: isNext ? "#facc15" : `${color}66`,
                  background: `linear-gradient(155deg, ${color}, ${color}dd)`,
                }}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md group-hover:scale-110 transition-transform bg-white/20"
                  >
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white truncate">
                        {subject.name.split("(")[0].trim()}
                      </p>
                      {isNext && (
                        <span className="shrink-0 text-xs font-bold text-amber-900 bg-amber-200/90 px-2 py-0.5 rounded-full border border-amber-300">
                          Next up
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={pct} className="h-2 flex-1 bg-white/25" />
                      <span className="text-xs text-white/90 tabular-nums shrink-0">
                        {completed}/{total}
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 shrink-0 group-hover:translate-x-0.5 transition-transform ${
                      isNext ? "text-amber-200" : "text-white/90"
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
