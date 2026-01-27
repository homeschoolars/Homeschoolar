"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Loader2, Sparkles } from "lucide-react"
import type { Child, Subject, WorksheetAssignment, Progress as ProgressType, SurpriseQuiz } from "@/lib/types"
import { SurpriseQuizModal } from "@/components/ai/surprise-quiz-modal"
import { InitialAssessment } from "@/components/ai/initial-assessment"
import { GamifiedHeader } from "@/components/dashboards/student/gamified-header"
import { WelcomeBanner } from "@/components/dashboards/student/welcome-banner"
import { DailyQuests, type Quest } from "@/components/dashboards/student/daily-quests"
import { SubjectPath } from "@/components/dashboards/student/subject-path"
import { AchievementsGrid } from "@/components/dashboards/student/achievements-grid"
import { NewsPanel } from "@/components/dashboards/student/news-panel"
import { apiFetch } from "@/lib/api-client"
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

export default function StudentDashboard() {
  const [child, setChild] = useState<Child | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([])
  const [progress, setProgress] = useState<ProgressType[]>([])
  const [gamification, setGamification] = useState<Gamification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showAssessment, setShowAssessment] = useState(false)
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

      if (data.subjects) {
        setSubjects(data.subjects)
      }
      if (data.assignments) {
        setAssignments(data.assignments)
      }
      if (data.progress) {
        setProgress(data.progress)
      }

      // Update child data from server (in case it changed)
      if (data.child) {
        setChild(data.child)
        sessionStorage.setItem("student_child", JSON.stringify(data.child))

        if (!data.child.assessment_completed) {
          setShowAssessment(true)
        } else {
          checkForSurpriseQuiz(data.child)
        }
      }

      const id = data.child?.id
      if (id) {
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
      const childData = JSON.parse(storedChild) as Child
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
    if (Math.random() < 0.2 && (!lastQuizAt || lastQuizAt < oneHourAgo)) {
      generateQuiz({ childId: childData.id, age_group: childData.age_group })
    }
  }

  const handleAssessmentComplete = () => {
    setShowAssessment(false)
    // Update child in session storage
    if (child) {
      const updatedChild = { ...child, assessment_completed: true }
      sessionStorage.setItem("student_child", JSON.stringify(updatedChild))
      setChild(updatedChild)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("student_child")
    router.push("/login")
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-lg font-medium text-red-600 mb-2">Something went wrong</p>
          <p className="text-sm text-gray-600 mb-4">{loadError}</p>
          <Button onClick={() => router.push("/login")} className="bg-purple-500 hover:bg-purple-600">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100">
        <div className="text-center">
          <div className="animate-bounce text-6xl mb-4">⭐</div>
          <p className="text-lg font-medium text-purple-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!child) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-lg font-medium text-purple-600 mb-4">Unable to load your profile</p>
          <Button onClick={() => router.push("/login")} className="bg-purple-500 hover:bg-purple-600">
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  if (showAssessment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100 py-8 px-4">
        <InitialAssessment
          childId={child.id}
          childName={child.name}
          ageGroup={child.age_group}
          subjects={subjects}
          onComplete={handleAssessmentComplete}
        />
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

  // Determine age band for UI styling and news
  const ageGroup = child.age_group
  const isYounger = ageGroup === "4-5" || ageGroup === "6-7"
  const ageBand: "4-7" | "8-13" = isYounger ? "4-7" : "8-13"

  return (
    <div className={`min-h-screen ${isYounger ? "bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100" : "bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100"}`}>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-4 border-amber-400">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-14 h-14 mx-auto mb-4 text-violet-500 animate-spin" />
              <h2 className="text-xl font-bold text-violet-700 mb-2">Preparing your surprise quiz...</h2>
              <p className="text-slate-600">AI is creating fun questions for you!</p>
            </CardContent>
          </Card>
        </div>
      )}

      {quizState === "error" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-4 border-red-200">
            <CardContent className="p-6 text-center">
              <div className="text-5xl mb-4">😕</div>
              <h2 className="text-xl font-bold text-red-700 mb-2">Couldn&apos;t load quiz</h2>
              <p className="text-slate-600 mb-6 text-sm">{quizError ?? "Please try again."}</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => { setQuizState("idle"); setQuizError(null); }}>
                  Dismiss
                </Button>
                <Button onClick={() => generateQuiz()} className="bg-violet-500 hover:bg-violet-600">
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

      <main className="container mx-auto px-4 py-6 sm:py-8">
        <WelcomeBanner
          child={child}
          completedToday={completedToday}
          dailyGoal={g?.dailyGoal}
          dailyGoalProgress={g?.dailyGoalProgress}
          streak={streak}
        />

        <DailyQuests
          quests={quests}
          onTakeQuiz={() => generateQuiz()}
          quizGenerating={quizState === "generating"}
          hasAssignment={assignments.length > 0}
        />

        {assignments.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-violet-800 mb-4">Your worksheets</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <Link href={`/student/worksheet/${assignment.id}`} key={assignment.id} className="block group">
                  <Card className="border-[3px] border-violet-200 hover:border-violet-400 transition-all hover:shadow-lg cursor-pointer h-full">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-bold text-violet-700 truncate">{assignment.worksheet?.title}</h3>
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
          <Card className="mb-8 border-[3px] border-dashed border-violet-300 bg-violet-50/80">
            <CardContent className="p-8 text-center">
              <div className="text-5xl mb-4">🌟</div>
              <h3 className="text-xl font-bold text-violet-700 mb-2">No worksheets assigned yet!</h3>
              <p className="text-violet-600">Ask your parent to assign some fun activities, or explore subjects below.</p>
            </CardContent>
          </Card>
        )}

        <SubjectPath subjects={subjects} progress={progress} />
        
        <div className="mb-8">
          <NewsPanel ageBand={ageBand} isYounger={isYounger} />
        </div>

        <AchievementsGrid
          worksheetsCompleted={g?.worksheetsCompleted ?? 0}
          streak={g?.streak ?? 0}
          quizCount={g?.quizCount}
        />
      </main>

      {isYounger && (
        <div className="fixed bottom-4 right-4 pointer-events-none">
          <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse" />
        </div>
      )}
      {!isYounger && (
        <div className="fixed bottom-4 right-4 pointer-events-none">
          <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
        </div>
      )}
    </div>
  )
}
