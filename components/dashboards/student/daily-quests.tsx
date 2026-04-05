"use client"

import { useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Check, Zap, Loader2, Target, Sparkles, Coins } from "lucide-react"
import confetti from "canvas-confetti"

export type Quest = {
  id: string
  title: string
  done: boolean
  today: boolean
  current?: number
  target?: number
  xp: number
  coins?: number
}

interface DailyQuestsProps {
  quests: Quest[]
  onTakeQuiz: () => void
  quizGenerating?: boolean
  hasAssignment?: boolean
  onQuestComplete?: (questId: string) => void
}

function triggerQuestCelebration() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ["#a855f7", "#ec4899", "#f59e0b", "#06b6d4"],
  })
}

export function DailyQuests({
  quests,
  onTakeQuiz,
  quizGenerating,
  hasAssignment,
  onQuestComplete,
}: DailyQuestsProps) {
  const prevDoneRef = useRef<Set<string>>(new Set())
  const isInitialMount = useRef(true)

  useEffect(() => {
    const doneIds = new Set(quests.filter((q) => q.done).map((q) => q.id))
    if (isInitialMount.current) {
      isInitialMount.current = false
      prevDoneRef.current = doneIds
      return
    }
    doneIds.forEach((id) => {
      if (!prevDoneRef.current.has(id)) {
        triggerQuestCelebration()
        onQuestComplete?.(id)
      }
    })
    prevDoneRef.current = doneIds
  }, [quests, onQuestComplete])

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25 ring-1 ring-white/30">
          <Target className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-[family-name:var(--font-heading)] tracking-tight">
            Daily quests
          </h2>
          <p className="text-sm text-slate-600">Complete quests to earn XP and coins.</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Hero: Surprise Quiz — Duolingo-style "Complete a lesson" */}
        <Card className="rounded-3xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/90 shadow-[0_12px_40px_-16px_rgba(245,158,11,0.35)] hover:shadow-[0_16px_48px_-12px_rgba(245,158,11,0.4)] transition-all overflow-hidden relative">
          <div className="absolute top-3 right-4 flex items-center gap-1 text-amber-800 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            Bonus XP
          </div>
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shrink-0">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-violet-900 text-lg">Surprise Quiz</h3>
                <p className="text-sm text-slate-600">AI creates a fun quiz. Test your knowledge!</p>
                <div className="flex items-center gap-3 mt-1.5 text-xs font-medium text-amber-800">
                  <span>+20 XP</span>
                  <span>+5 coins</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => onTakeQuiz()}
              disabled={quizGenerating}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-base px-6 py-6 rounded-2xl shadow-lg shadow-amber-500/25 transition-all shrink-0"
            >
              {quizGenerating ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Start quiz
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Quest cards with progress */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quests.map((q) => {
            const current = q.current ?? 0
            const target = q.target ?? 1
            const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0

            return (
              <Card
                key={q.id}
                className={`rounded-2xl transition-all ${
                  q.done
                    ? "border border-emerald-200/90 bg-emerald-50/90 shadow-sm"
                    : "border border-slate-200/80 bg-white/90 backdrop-blur-sm hover:border-violet-200 hover:shadow-lg"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        q.done ? "bg-green-500 text-white" : "bg-violet-100 text-violet-600"
                      }`}
                    >
                      {q.done ? <Check className="h-5 w-5" /> : <Target className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold text-sm ${q.done ? "text-green-800" : "text-violet-800"}`}>
                        {q.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                        <span>+{q.xp} XP</span>
                        {q.coins != null && q.coins > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Coins className="h-3 w-3 text-amber-500" />
                            +{q.coins}
                          </span>
                        )}
                      </div>
                      {!q.done && target > 1 && (
                        <div className="mt-2">
                          <Progress value={progress} className="h-2 bg-violet-100" />
                          <p className="text-xs text-violet-600 mt-1 tabular-nums">
                            {current} / {target}
                          </p>
                        </div>
                      )}
                      {!q.done && target === 1 && (
                        <p className="text-xs text-violet-600 mt-1 tabular-nums">
                          {current} / {target}
                        </p>
                      )}
                    </div>
                    {q.done && (
                      <span className="text-2xl shrink-0" role="img" aria-label="done">
                        ✅
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {hasAssignment && (
          <p className="text-sm text-slate-600 text-center max-w-lg mx-auto">
            Complete a worksheet from &quot;Your worksheets&quot; or &quot;Your learning path&quot; below to finish the worksheet quest!
          </p>
        )}
      </div>
    </section>
  )
}
