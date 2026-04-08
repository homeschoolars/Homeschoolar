"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Loader2, Sparkles } from "lucide-react"
import type { Child, Subject, WorksheetAssignment, Progress as ProgressType, SurpriseQuiz } from "@/lib/types"
import { SurpriseQuizModal } from "@/components/ai/surprise-quiz-modal"
import { GamifiedHeader } from "@/components/dashboards/student/gamified-header"
import { WelcomeBanner } from "@/components/dashboards/student/welcome-banner"
import { DailyQuests, type Quest } from "@/components/dashboards/student/daily-quests"
import { SubjectPath } from "@/components/dashboards/student/subject-path"
import { AchievementsGrid } from "@/components/dashboards/student/achievements-grid"
import { NewsPanel } from "@/components/dashboards/student/news-panel"
import { apiFetch } from "@/lib/api-client"
import { augmentChildLearningFields, isYoungLearnerClassKey } from "@/lib/learning-class"
import confetti from "canvas-confetti"

type Gamification = {
  xp: number
  level: number
  stars: number
  coins: number
  streak: number
  worksheetsCompleted: number
  quizCount: number
  quests: Quest[]
  completedToday: number
  dailyGoal?: number
  dailyGoalProgress?: number
  xpToNextLevel?: number
  xpInLevel?: number
}

type SharedGeneratedItem = {
  id: string
  unitId: string | null
  subjectName: string
  unitTitle: string
  contentType: "quiz" | "worksheet" | "activity"
  content: string
  contentJson?: unknown
  createdAt: string
}

export default function StudentDashboard() {
  const [child, setChild] = useState<Child | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([])
  const [progress, setProgress] = useState<ProgressType[]>([])
  const [gamification, setGamification] = useState<Gamification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sharedGeneratedContent, setSharedGeneratedContent] = useState<SharedGeneratedItem[]>([])
  const [surpriseQuiz, setSurpriseQuiz] = useState<SurpriseQuiz | null>(null)
  const [quizState, setQuizState] = useState<"idle" | "generating" | "ready" | "error">("idle")
  const [quizError, setQuizError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const router = useRouter()
  const prevDailyGoalRef = useRef<{ progress: number; goal: number } | null>(null)
  const isInitialGamificationMount = useRef(true)

  const loadData = async (childId: string) => {
    try {
      const response = await apiFetch("/api/student/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        setLoadError(`API error: ${response.status} - ${errorText}`)
        setIsLoading(false)
        return
      }

      const data = await response.json()

      const payload = data?.data ?? data

      if (payload.subjects) {
        setSubjects(payload.subjects)
      }
      if (payload.assignments) {
        setAssignments(payload.assignments)
      }
      if (payload.progress) {
        setProgress(payload.progress)
      }

      // Update child data from server (in case it changed)
      if (payload.child) {
        const merged = { ...payload.child, ...augmentChildLearningFields(payload.child) }
        setChild(merged)
        sessionStorage.setItem("student_child", JSON.stringify(merged))

        if (payload.child.assessment_completed) {
          if (payload.pendingQuiz) {
            setSurpriseQuiz(payload.pendingQuiz)
            setQuizState("ready")
          } else {
            checkForSurpriseQuiz(payload.child)
          }
        } else {
          setSurpriseQuiz(null)
          setQuizState("idle")
        }
      }

      const id = payload.child?.id
      if (id) {
        const sharedRes = await apiFetch(`/api/student/generated-content?childId=${encodeURIComponent(id)}`)
        if (sharedRes.ok) {
          const sharedPayload = (await sharedRes.json()) as {
            success?: boolean
            data?: { items?: SharedGeneratedItem[] }
          }
          setSharedGeneratedContent(sharedPayload?.data?.items ?? [])
        } else {
          setSharedGeneratedContent([])
        }

        const gRes = await apiFetch(`/api/student/gamification?childId=${encodeURIComponent(id)}`)
        if (gRes.ok) {
          const g = (await gRes.json()) as Gamification
          setGamification(g)
          const goal = g.dailyGoal ?? 3
          const progress = g.dailyGoalProgress ?? 0
          if (isInitialGamificationMount.current) {
            isInitialGamificationMount.current = false
            prevDailyGoalRef.current = { progress, goal }
          } else {
            const prev = prevDailyGoalRef.current
            if (prev && prev.progress < prev.goal && progress >= goal) {
              confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
                colors: ["#fbbf24", "#a855f7", "#ec4899", "#06b6d4"],
              })
            }
            prevDailyGoalRef.current = { progress, goal }
          }
        }
      }
    } catch (error) {
      console.error("Error loading data:", error)
      setLoadError(`Error loading data: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const storedChild = sessionStorage.getItem("student_child")

    if (!storedChild) {
      router.push("/login")
      return
    }

    try {
      const parsed = JSON.parse(storedChild) as Child
      const childData = { ...parsed, ...augmentChildLearningFields(parsed) }
      setChild(childData)
      loadData(childData.id)
    } catch (e) {
      setLoadError("Error parsing child data: " + (e instanceof Error ? e.message : String(e)))
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const generateQuiz = async (override?: { childId: string; age_group: string }) => {
    const c = override ?? (child ? { childId: child.id, age_group: child.age_group } : null)
    if (!c) return
    setQuizState("generating")
    setQuizError(null)

    try {
      const response = await apiFetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: c.childId,
          age_group: c.age_group,
        }),
      })

      const raw = await response.text()
      if (!response.ok) {
        let msg = "Couldn't load quiz."
        try {
          const parsed = JSON.parse(raw) as { error?: string }
          if (parsed?.error) msg = parsed.error
        } catch {
          if (raw) msg = raw
        }
        setQuizError(msg)
        setQuizState("error")
        return
      }

      const data = JSON.parse(raw) as { quiz: SurpriseQuiz }
      setSurpriseQuiz(data.quiz)
      setQuizState("ready")
    } catch (error) {
      console.error("Error generating quiz:", error)
      setQuizError(error instanceof Error ? error.message : "Couldn't load quiz. Please try again.")
      setQuizState("error")
    }
  }

  const checkForSurpriseQuiz = async (childData: Child) => {
    const lastQuizAt = childData.last_quiz_at ? new Date(childData.last_quiz_at) : null
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    if (Math.random() < 0.18 && (!lastQuizAt || lastQuizAt < oneHourAgo)) {
      generateQuiz({ childId: childData.id, age_group: childData.age_group })
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("student_child")
    router.push("/login")
  }

  if (loadError) {
    return (
      <div className="min-h-screen dashboard-student-teen flex items-center justify-center px-4">
        <div className="text-center max-w-md rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-8 shadow-2xl shadow-violet-500/10">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-lg font-semibold text-red-600 mb-2 font-[family-name:var(--font-heading)]">Something went wrong</p>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">{loadError}</p>
          <Button onClick={() => router.push("/login")} className="rounded-xl bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-500/25">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen dashboard-student-teen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-3xl shadow-lg shadow-violet-500/30 mb-5 animate-pulse">
            ⭐
          </div>
          <p className="text-lg font-semibold text-slate-700 font-[family-name:var(--font-heading)]">Loading your dashboard…</p>
          <p className="text-sm text-slate-500 mt-1">One moment</p>
        </div>
      </div>
    )
  }

  if (!child) {
    return (
      <div className="min-h-screen dashboard-student-teen flex items-center justify-center px-4">
        <div className="text-center max-w-md rounded-3xl border border-slate-200/80 bg-white/90 backdrop-blur-md p-8 shadow-xl">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-lg font-semibold text-slate-800 mb-4 font-[family-name:var(--font-heading)]">Unable to load your profile</p>
          <Button onClick={() => router.push("/login")} className="rounded-xl bg-violet-600 hover:bg-violet-700">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  const g = gamification
  const stars = g?.stars ?? 0
  const level = g?.level ?? 1
  const coins = g?.coins ?? 0
  const streak = g?.streak ?? 0
  const completedToday = g?.completedToday ?? 0
  const quests = g?.quests ?? []
  const hasFirstLessonCompleted =
    (g?.worksheetsCompleted ?? 0) > 0 || progress.some((entry) => (entry.completed_worksheets ?? 0) > 0)

  // Younger dashboard theme + news band (aligned with classes through age 7)
  const isYounger = isYoungLearnerClassKey(child.learning_class_key)
  const ageBand: "4-7" | "8-13" = isYounger ? "4-7" : "8-13"

  return (
    <div className={`min-h-screen ${isYounger ? "dashboard-student-young" : "dashboard-student-teen"}`}>
      {surpriseQuiz && quizState === "ready" && (
        <SurpriseQuizModal
          quiz={surpriseQuiz}
          ageGroup={child.age_group}
          onComplete={() => {
            if (child) loadData(child.id)
          }}
          onClose={() => {
            setSurpriseQuiz(null)
            setQuizState("idle")
          }}
        />
      )}

      {quizState === "generating" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border border-amber-200/80 rounded-3xl shadow-2xl shadow-amber-500/20 bg-white/95 backdrop-blur-md">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-violet-600 animate-spin" />
              <h2 className="text-xl font-bold text-slate-900 mb-2 font-[family-name:var(--font-heading)]">Preparing your surprise quiz…</h2>
              <p className="text-slate-600 text-sm">AI is crafting questions for you.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {quizState === "error" && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border border-red-200/80 rounded-3xl shadow-xl bg-white/95 backdrop-blur-md">
            <CardContent className="p-6 text-center">
              <div className="text-5xl mb-4">😕</div>
              <h2 className="text-xl font-bold text-red-700 mb-2 font-[family-name:var(--font-heading)]">Couldn&apos;t load quiz</h2>
              <p className="text-slate-600 mb-6 text-sm">{quizError ?? "Please try again."}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" className="rounded-xl" onClick={() => { setQuizState("idle"); setQuizError(null); }}>
                  Dismiss
                </Button>
                <Button onClick={() => generateQuiz()} className="rounded-xl bg-violet-600 hover:bg-violet-700">
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <GamifiedHeader
        child={child}
        stars={stars}
        level={level}
        coins={coins}
        streak={streak}
        xpInLevel={g?.xpInLevel}
        xpToNextLevel={g?.xpToNextLevel}
      />

      <main className="container mx-auto px-4 py-6 sm:py-10 max-w-6xl">
        <WelcomeBanner
          child={child}
          completedToday={completedToday}
          dailyGoal={g?.dailyGoal}
          dailyGoalProgress={g?.dailyGoalProgress}
          streak={streak}
          coins={coins}
          level={level}
          xpInLevel={g?.xpInLevel}
          xpToNextLevel={g?.xpToNextLevel}
        />

        <DailyQuests
          quests={quests}
          onTakeQuiz={() => generateQuiz()}
          quizGenerating={quizState === "generating"}
          hasAssignment={assignments.length > 0}
        />

        {assignments.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1 font-[family-name:var(--font-heading)] tracking-tight">
              Your worksheets
            </h2>
            <p className="text-sm text-slate-600 mb-4">Tap a card to open and complete.</p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <Link href={`/student/worksheet/${assignment.id}`} key={assignment.id} className="block group">
                  <Card className="h-full rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-[0_8px_30px_-14px_rgba(15,23,42,0.12)] hover:border-violet-300/80 hover:shadow-[0_16px_40px_-12px_rgba(99,102,241,0.2)] transition-all cursor-pointer">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-violet-800 truncate group-hover:text-violet-900">{assignment.worksheet?.title}</h3>
                        <p className="text-sm text-slate-500 truncate">{assignment.worksheet?.description}</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-violet-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {assignments.length === 0 && (
          <Card className="mb-8 rounded-3xl border border-dashed border-violet-200/80 bg-white/70 backdrop-blur-sm shadow-inner">
            <CardContent className="p-8 sm:p-10 text-center">
              <div className="text-5xl mb-4">🌟</div>
              <h3 className="text-xl font-bold text-slate-900 mb-2 font-[family-name:var(--font-heading)]">No worksheets yet</h3>
              <p className="text-slate-600 max-w-md mx-auto">Ask your parent to assign activities, or explore subjects below.</p>
              <Button asChild className="mt-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25">
                <Link href="/student/subjects">Explore subjects</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {sharedGeneratedContent.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 font-[family-name:var(--font-heading)] tracking-tight">
              Shared by parent
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {sharedGeneratedContent.map((item) => (
                <Card key={item.id} className="rounded-2xl border border-violet-200/70 bg-white/85 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <p className="text-sm font-semibold capitalize text-violet-700">
                      {item.contentType} • {item.subjectName || "Subject"} • {item.unitTitle || "Unit"}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 line-clamp-6">{item.content}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <SubjectPath subjects={subjects} progress={progress} />
        
        <div className="mb-8">
          <NewsPanel ageBand={ageBand} isYounger={isYounger} />
        </div>

        <AchievementsGrid
          worksheetsCompleted={g?.worksheetsCompleted ?? 0}
          streak={g?.streak ?? 0}
          quizCount={g?.quizCount}
          hasFirstLessonCompleted={hasFirstLessonCompleted}
        />
      </main>

      <div className="fixed bottom-5 right-5 pointer-events-none opacity-40">
        <Sparkles className={`w-7 h-7 ${isYounger ? "text-amber-500" : "text-violet-400"} animate-pulse`} />
      </div>
    </div>
  )
}
