"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
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
  Sparkles,
  Trophy,
  Target,
  LogOut,
  ChevronRight,
  Zap,
} from "lucide-react"
import type { Child, Subject, WorksheetAssignment, Progress as ProgressType, SurpriseQuiz } from "@/lib/types"
import { SurpriseQuizModal } from "@/components/ai/surprise-quiz-modal"
import { InitialAssessment } from "@/components/ai/initial-assessment"

const subjectIcons: Record<string, React.ReactNode> = {
  "book-open": <BookOpen className="w-6 h-6" />,
  calculator: <Calculator className="w-6 h-6" />,
  flask: <FlaskConical className="w-6 h-6" />,
  globe: <Globe className="w-6 h-6" />,
  heart: <Heart className="w-6 h-6" />,
  users: <Users className="w-6 h-6" />,
  smile: <Smile className="w-6 h-6" />,
  activity: <Activity className="w-6 h-6" />,
  "piggy-bank": <PiggyBank className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
}

export default function StudentDashboard() {
  const [child, setChild] = useState<Child | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([])
  const [progress, setProgress] = useState<ProgressType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAssessment, setShowAssessment] = useState(false)
  const [surpriseQuiz, setSurpriseQuiz] = useState<SurpriseQuiz | null>(null)
  const [showQuizPrompt, setShowQuizPrompt] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const router = useRouter()

  const loadData = async (childId: string) => {
    try {
      const response = await fetch("/api/student/dashboard", {
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

        // Check if assessment is needed
        if (!data.child.assessment_completed) {
          setShowAssessment(true)
        } else {
          // Check for surprise quiz (20% chance)
          checkForSurpriseQuiz(data.child)
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

  const checkForSurpriseQuiz = async (childData: Child) => {
    // 20% chance of surprise quiz if last quiz was more than 1 hour ago
    const lastQuizAt = childData.last_quiz_at ? new Date(childData.last_quiz_at) : null
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    if (Math.random() < 0.2 && (!lastQuizAt || lastQuizAt < oneHourAgo)) {
      setShowQuizPrompt(true)
    }
  }

  const startSurpriseQuiz = async () => {
    if (!child) return
    setShowQuizPrompt(false)

    try {
      const response = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          child_id: child.id,
          age_group: child.age_group,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSurpriseQuiz(data.quiz)
      }
    } catch (error) {
      console.error("Error generating quiz:", error)
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
          subjects={subjects.slice(0, 5)}
          onComplete={handleAssessmentComplete}
        />
      </div>
    )
  }

  const totalStars = 45
  const completedToday = 2

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100">
      {surpriseQuiz && (
        <SurpriseQuizModal
          quiz={surpriseQuiz}
          ageGroup={child.age_group}
          onComplete={(score) => {
            console.log("Quiz completed with score:", score)
          }}
          onClose={() => setSurpriseQuiz(null)}
        />
      )}

      {showQuizPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border-4 border-yellow-400 animate-bounce">
            <CardContent className="p-6 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-purple-700 mb-2">Surprise Quiz Time!</h2>
              <p className="text-gray-600 mb-6">Ready for a quick fun challenge? Test your knowledge!</p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowQuizPrompt(false)} className="bg-transparent">
                  Maybe Later
                </Button>
                <Button
                  onClick={startSurpriseQuiz}
                  className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {"Let's Go!"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b-4 border-purple-200">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="HomeSchoolar Logo" width={40} height={40} />
            <span className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              HomeSchoolar
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-full border-2 border-yellow-300">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <span className="font-bold text-yellow-700">{totalStars} Stars</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-red-500">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <Card className="mb-8 border-4 border-purple-300 bg-gradient-to-r from-pink-200 via-purple-200 to-cyan-200 overflow-hidden relative">
          <div className="absolute top-2 right-4 text-6xl animate-bounce">🎉</div>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-400 to-purple-500 flex items-center justify-center text-4xl text-white border-4 border-white shadow-lg">
                {child.avatar_url || "👧"}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-purple-800">Hi, {child.name}! 👋</h1>
                <p className="text-purple-600 text-lg">Ready for another amazing day of learning?</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium border border-green-300">
                    Age: {child.age_group} years
                  </span>
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-300">
                    {completedToday} worksheets done today!
                  </span>
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium border border-purple-300 capitalize">
                    Level: {child.current_level || "beginner"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-8 h-8 text-pink-500" />
            <h2 className="text-2xl font-bold text-purple-800">{"Today's Adventures"}</h2>
          </div>

          {assignments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignments.map((assignment) => (
                <Link href={`/student/worksheet/${assignment.id}`} key={assignment.id} className="block group">
                  <Card
                    className="border-[3px] border-purple-200 hover:border-purple-400 transition-all hover:shadow-lg cursor-pointer h-full"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-purple-700">{assignment.worksheet?.title}</h3>
                          <p className="text-sm text-gray-500">{assignment.worksheet?.description}</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-purple-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="border-[3px] border-dashed border-purple-300 bg-purple-50">
              <CardContent className="p-8 text-center">
                <div className="text-5xl mb-4">🌟</div>
                <h3 className="text-xl font-bold text-purple-700 mb-2">No worksheets assigned yet!</h3>
                <p className="text-purple-600">Ask your parent to assign some fun activities for you.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Subjects Grid */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-8 h-8 text-teal-500" />
            <h2 className="text-2xl font-bold text-purple-800">Your Subjects</h2>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {subjects.map((subject) => {
              const subjectProgress = progress.find((p) => p.subject_id === subject.id)
              const progressPercent = subjectProgress
                ? (subjectProgress.completed_worksheets / Math.max(subjectProgress.total_worksheets, 1)) * 100
                : 0

              return (
                <Link href={`/student/subject/${subject.id}`} key={subject.id} className="block group">
                  <Card
                    className="border-[3px] hover:scale-105 transition-all cursor-pointer overflow-hidden h-full"
                    style={{ borderColor: subject.color || "#8B5CF6" }}
                  >
                    <CardHeader className="pb-2">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: subject.color || "#8B5CF6" }}
                      >
                        {subjectIcons[subject.icon || "book-open"] || subjectIcons["book-open"]}
                      </div>
                      <CardTitle className="text-sm font-bold leading-tight">
                        {subject.name.split("(")[0].trim()}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Progress value={progressPercent} className="h-2 mb-1" />
                      <p className="text-xs text-gray-500">
                        {subjectProgress?.completed_worksheets || 0} / {subjectProgress?.total_worksheets || 0} done
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Achievements */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-yellow-500" />
            <h2 className="text-2xl font-bold text-purple-800">Your Achievements</h2>
          </div>

          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[
              { icon: "🌟", title: "First Star", desc: "Complete your first worksheet", unlocked: true },
              { icon: "🔥", title: "On Fire!", desc: "3 day learning streak", unlocked: true },
              { icon: "🏆", title: "Champion", desc: "Score 100% on a worksheet", unlocked: false },
              { icon: "📚", title: "Bookworm", desc: "Complete 10 worksheets", unlocked: false },
            ].map((achievement, index) => (
              <Card
                key={index}
                className={`border-[3px] text-center ${achievement.unlocked ? "border-yellow-300 bg-yellow-50" : "border-gray-200 bg-gray-50 opacity-60"
                  }`}
              >
                <CardContent className="p-4">
                  <div className={`text-4xl mb-2 ${achievement.unlocked ? "animate-bounce" : "grayscale"}`}>
                    {achievement.icon}
                  </div>
                  <h3 className="font-bold text-sm">{achievement.title}</h3>
                  <p className="text-xs text-gray-500">{achievement.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-4 right-4 pointer-events-none">
        <Sparkles className="w-8 h-8 text-pink-400 animate-pulse" />
      </div>
    </div>
  )
}
