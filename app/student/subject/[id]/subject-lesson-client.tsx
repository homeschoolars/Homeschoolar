"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-client"

type CurriculumLesson = {
  id: string
  title: string
  slug: string
  orderIndex?: number
  displayOrder?: number
}

type CurriculumUnit = {
  id: string
  title: string
  lessons: CurriculumLesson[]
}

type CurriculumSubjectResponse = {
  subject: {
    id: string
    name: string
    units: CurriculumUnit[]
  }
}

type LessonDetailResponse = {
  lesson: {
    id: string
    title: string
    difficultyLevel?: string
    content: {
      storyText: string
      activityInstructions: string
      quizConcept: string
      worksheetExample: string
      parentTip: string
    } | null
  }
}

type GeneratedState = {
  value: string
  cached: boolean
  json?: unknown
}

type GenerationType = "story" | "worksheet" | "quiz" | "project" | "debate" | "research" | "reflection"

type WorksheetContent = {
  title: string
  instructions: string
  activities: string[]
}

const AGE_GROUP_LABELS: Record<string, string> = {
  "4-5": "Little Explorers 🌱",
  "5-6": "Mini Adventurers 🐾",
  "6-7": "Curious Minds 🔍",
  "7-8": "Young Investigators 🧩",
  "8-9": "Growing Learners 💡",
  "9-10": "Knowledge Explorers 🚀",
  "10-11": "Knowledge Builders 🏗️",
  "11-12": "Skill Sharpeners ⚡",
  "12-13": "Future Leaders 🌟",
}

function getAgeStart(ageGroup: string) {
  const first = ageGroup.split("-")[0]
  const parsed = Number.parseInt(first, 10)
  return Number.isFinite(parsed) ? parsed : 4
}

function isWorksheetContent(value: unknown): value is WorksheetContent {
  if (!value || typeof value !== "object") return false
  const payload = value as Record<string, unknown>
  return (
    typeof payload.title === "string" &&
    typeof payload.instructions === "string" &&
    Array.isArray(payload.activities) &&
    payload.activities.every((item) => typeof item === "string")
  )
}

export function SubjectLessonClient({ subjectId }: { subjectId: string }) {
  const [ageGroup, setAgeGroup] = useState("4-5")
  const [availableAgeGroups, setAvailableAgeGroups] = useState<Array<{ name: string; label: string }>>([])
  const [subject, setSubject] = useState<CurriculumSubjectResponse["subject"] | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [lesson, setLesson] = useState<LessonDetailResponse["lesson"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [lessonLoading, setLessonLoading] = useState(false)
  const [progressLoading, setProgressLoading] = useState(false)
  const [lessonProgress, setLessonProgress] = useState<{
    status: "locked" | "unlocked" | "completed"
    canAccess: boolean
    lessons: Array<{ lessonId: string; title: string; orderIndex?: number; status: "locked" | "unlocked" | "completed" }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generatingType, setGeneratingType] = useState<GenerationType | null>(null)
  const [generatedContent, setGeneratedContent] = useState<Record<GenerationType, GeneratedState | null>>({
    story: null,
    worksheet: null,
    quiz: null,
    project: null,
    debate: null,
    research: null,
    reflection: null,
  })
  const [sharedContent, setSharedContent] = useState<
    Array<{
      id: string
      unitId: string | null
      subjectName: string
      unitTitle: string
      contentType: "quiz" | "worksheet"
      content: string
      contentJson?: unknown
      createdAt: string
    }>
  >([])
  const [examState, setExamState] = useState<{
    exam: {
      id: string
      examJson: { mcqs?: Array<{ question: string; options: string[]; correctAnswer: string }>; shortQuestions?: Array<{ question: string; sampleAnswer: string }> }
      score: number | null
      completedAt: string | null
    } | null
    answers: {
      mcqs: Array<{ index: number; answer: string }>
      shortQuestions: Array<{ index: number; answer: string }>
    }
  }>({
    exam: null,
    answers: { mcqs: [], shortQuestions: [] },
  })

  useEffect(() => {
    const loadAgeGroups = async () => {
      try {
        const res = await apiFetch("/api/age-groups")
        if (!res.ok) return
        const payload = (await res.json()) as { ageGroups?: Array<{ name: string; stageName?: string }> }
        const groups = (payload.ageGroups ?? []).map((a) => ({
          name: a.name,
          label: AGE_GROUP_LABELS[a.name] ?? a.stageName ?? a.name,
        }))
        groups.sort((a, b) => getAgeStart(a.name) - getAgeStart(b.name))
        if (groups.length > 0) {
          setAvailableAgeGroups(groups)
        }
      } catch {
        // Ignore age group fetch errors.
      }
    }
    void loadAgeGroups()
  }, [])

  useEffect(() => {
    const raw = sessionStorage.getItem("student_child")
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as { id?: string; age_group?: string }
      if (parsed?.age_group) setAgeGroup(parsed.age_group)
    } catch {
      // Ignore malformed session storage and keep default age group.
    }
  }, [])

  useEffect(() => {
    const fetchSubject = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(
          `/api/curriculum/subjects/${encodeURIComponent(subjectId)}?ageGroup=${encodeURIComponent(ageGroup)}`
        )
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? "Unable to load curriculum subject")
        }
        const data = (await res.json()) as CurriculumSubjectResponse
        setSubject(data.subject)
        const firstUnit = data.subject.units[0]
        const firstLesson = firstUnit?.lessons[0]
        setSelectedUnitId(firstUnit?.id ?? null)
        setSelectedLessonId(firstLesson?.id ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load curriculum")
      } finally {
        setLoading(false)
      }
    }

    void fetchSubject()
  }, [subjectId, ageGroup])

  useEffect(() => {
    if (!selectedLessonId) return
    const fetchLesson = async () => {
      setLessonLoading(true)
      try {
        const res = await apiFetch(`/api/curriculum/lessons/${encodeURIComponent(selectedLessonId)}`)
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? "Unable to load lesson")
        }
        const data = (await res.json()) as LessonDetailResponse
        setLesson(data.lesson)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load lesson")
      } finally {
        setLessonLoading(false)
      }
    }

    void fetchLesson()
  }, [selectedLessonId])

  useEffect(() => {
    if (!selectedLessonId) return
    const raw = sessionStorage.getItem("student_child")
    if (!raw) return
    let childId = ""
    try {
      const parsed = JSON.parse(raw) as { id?: string }
      childId = parsed?.id ?? ""
    } catch {
      return
    }
    if (!childId) return

    const fetchProgress = async () => {
      setProgressLoading(true)
      try {
        const res = await apiFetch(
          `/api/lessons/progress?childId=${encodeURIComponent(childId)}&lessonId=${encodeURIComponent(selectedLessonId)}`,
        )
        const payload = (await res.json()) as {
          success?: boolean
          data?: {
            status: "locked" | "unlocked" | "completed"
            canAccess: boolean
            lessons: Array<{ lessonId: string; title: string; orderIndex?: number; status: "locked" | "unlocked" | "completed" }>
          }
          error?: string
        }
        if (!res.ok || !payload?.data) {
          throw new Error(payload?.error ?? "Unable to load lesson progress")
        }
        setLessonProgress(payload.data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load lesson progress")
      } finally {
        setProgressLoading(false)
      }
    }
    void fetchProgress()
  }, [selectedLessonId])

  const selectedUnit = useMemo(
    () => subject?.units.find((unit) => unit.id === selectedUnitId) ?? null,
    [subject, selectedUnitId]
  )

  const ageStart = getAgeStart(ageGroup)
  const supportsProject = ageStart >= 8
  const supportsResearch = ageStart >= 10
  const supportsDebate = ageStart >= 11
  const supportsReflection = ageStart >= 10
  const allLessonsCompleted = lessonProgress ? lessonProgress.lessons.length > 0 && lessonProgress.lessons.every((l) => l.status === "completed") : false

  const handleGenerate = async (type: GenerationType) => {
    if (!selectedLessonId) return
    if (lessonProgress && !lessonProgress.canAccess) return
    setGeneratingType(type)
    try {
      const raw = sessionStorage.getItem("student_child")
      const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
      const res = await apiFetch(`/api/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: selectedLessonId, contentType: type, childId }),
      })
      const payload = (await res.json()) as {
        success?: boolean
        data?: { content?: string; cached?: boolean; contentJson?: unknown }
        error?: string
      }
      if (!res.ok || !payload.data?.content) {
        throw new Error(payload.error ?? "Generation failed")
      }
      setGeneratedContent((prev) => ({
        ...prev,
        [type]: { value: payload.data!.content!, cached: Boolean(payload.data?.cached), json: payload.data?.contentJson },
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate content")
    } finally {
      setGeneratingType(null)
    }
  }

  const completeCurrentLesson = async () => {
    if (!selectedLessonId) return
    const raw = sessionStorage.getItem("student_child")
    const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
    if (!childId) return

    try {
      const res = await apiFetch("/api/lesson/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId, lessonId: selectedLessonId }),
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || payload.success !== true) {
        throw new Error(payload.error ?? "Failed to complete lesson")
      }
      const progressRes = await apiFetch(
        `/api/lessons/progress?childId=${encodeURIComponent(childId)}&lessonId=${encodeURIComponent(selectedLessonId)}`,
      )
      const progressPayload = (await progressRes.json()) as {
        success?: boolean
        data?: {
          status: "locked" | "unlocked" | "completed"
          canAccess: boolean
          lessons: Array<{ lessonId: string; title: string; orderIndex?: number; status: "locked" | "unlocked" | "completed" }>
        }
      }
      if (progressRes.ok && progressPayload.data) {
        setLessonProgress(progressPayload.data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to complete lesson")
    }
  }

  const loadSharedContent = async () => {
    const raw = sessionStorage.getItem("student_child")
    const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
    if (!childId) return
    try {
      const res = await apiFetch(`/api/student/generated-content?childId=${encodeURIComponent(childId)}`)
      const payload = (await res.json()) as { success?: boolean; data?: { items: typeof sharedContent } }
      if (res.ok && payload.data?.items) {
        setSharedContent(payload.data.items)
      }
    } catch {
      // Ignore silent load errors for shared content panel.
    }
  }

  const loadLatestExam = async () => {
    const raw = sessionStorage.getItem("student_child")
    const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
    if (!childId) return
    try {
      const res = await apiFetch(
        `/api/exam/latest?studentId=${encodeURIComponent(childId)}&subjectId=${encodeURIComponent(subjectId)}`,
      )
      const payload = (await res.json()) as {
        success?: boolean
        data?: {
          exam: {
            id: string
            examJson: {
              mcqs?: Array<{ question: string; options: string[]; correctAnswer: string }>
              shortQuestions?: Array<{ question: string; sampleAnswer: string }>
            }
            score: number | null
            completedAt: string | null
          } | null
        }
      }
      if (res.ok && payload.data) {
        setExamState((prev) => ({ ...prev, exam: payload.data?.exam ?? null }))
      }
    } catch {
      // Ignore.
    }
  }

  useEffect(() => {
    void loadSharedContent()
    void loadLatestExam()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId])

  const submitExam = async () => {
    if (!examState.exam) return
    const raw = sessionStorage.getItem("student_child")
    const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
    if (!childId) return
    try {
      const res = await apiFetch("/api/exam/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: childId,
          examId: examState.exam.id,
          answers: examState.answers,
        }),
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || payload.success !== true) {
        throw new Error(payload.error ?? "Failed to submit exam")
      }
      await loadLatestExam()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit exam")
    }
  }

  const renderGeneratedContent = (type: GenerationType, generated: GeneratedState) => {
    if (type === "worksheet" && isWorksheetContent(generated.json)) {
      const worksheet = generated.json
      return (
        <div className="mt-2 rounded-md bg-white p-3">
          <p className="text-base font-semibold text-slate-800">{worksheet.title}</p>
          <p className="mt-2 text-sm text-slate-700">{worksheet.instructions}</p>
          <div className="mt-3 space-y-2">
            {worksheet.activities.map((activity, index) => (
              <div key={`${activity}-${index}`} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-sm font-medium text-amber-900">Activity {index + 1}</p>
                <p className="mt-1 text-sm text-slate-700">{activity}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return <p className="mt-2 whitespace-pre-wrap text-slate-700">{generated.value}</p>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
          <p className="mt-3 text-violet-700 font-medium">Loading curriculum...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100 p-4 md:p-8">
      <Button variant="ghost" asChild className="mb-6 hover:bg-white/50">
        <Link href="/student">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="mb-4 flex items-center justify-end">
        <Image src="/homeschoolars-logo-v2.png" alt="HomeSchoolar logo" width={120} height={40} className="h-10 w-auto" />
      </div>

      {error && (
        <Card className="mb-4 border-red-300">
          <CardContent className="pt-6 text-red-700 text-sm">{error}</CardContent>
        </Card>
      )}

      {!subject ? (
        <Card>
          <CardContent className="pt-6">No curriculum found for this subject and age group.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="max-w-xs">
                <p className="text-sm font-medium text-slate-700 mb-2">Age selection</p>
                <Select value={ageGroup} onValueChange={setAgeGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgeGroups.map((age) => (
                      <SelectItem key={age.name} value={age.name}>
                        {age.label} ({age.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>{subject.name} Units</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {subject.units.map((unit) => (
                <div key={unit.id} className="rounded-lg border p-3 bg-slate-50">
                  <button
                    className={`w-full text-left font-semibold ${selectedUnitId === unit.id ? "text-violet-700" : "text-slate-800"}`}
                    onClick={() => {
                      setSelectedUnitId(unit.id)
                      setSelectedLessonId(unit.lessons[0]?.id ?? null)
                    }}
                  >
                    {unit.title}
                  </button>
                  <div className="mt-2 space-y-1">
                    {unit.lessons.map((item) => (
                      <button
                        key={item.id}
                        className={`block w-full rounded px-2 py-1 text-left text-sm ${
                          selectedLessonId === item.id ? "bg-violet-100 text-violet-800" : "hover:bg-slate-100"
                        }`}
                        onClick={() => {
                          setSelectedUnitId(unit.id)
                          setSelectedLessonId(item.id)
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          {lessonProgress?.lessons.find((l) => l.lessonId === item.id)?.status === "completed" ? "✔" : null}
                          {lessonProgress?.lessons.find((l) => l.lessonId === item.id)?.status === "unlocked" ? "▶" : null}
                          {lessonProgress?.lessons.find((l) => l.lessonId === item.id)?.status === "locked" ? "🔒" : null}
                          {item.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {lesson?.title ?? selectedUnit?.title ?? "Lesson"}{" "}
                <span className="text-sm font-normal text-slate-500">({ageGroup})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {lessonLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading lesson details...
                </div>
              )}
              {progressLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading progression state...
                </div>
              )}

              {lessonProgress && !lessonProgress.canAccess && (
                <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  This lesson is locked. Complete the current unlocked lesson first.
                </section>
              )}

              {!lessonLoading && lesson?.content && (
                <>
                  <section>
                    <h3 className="font-semibold text-violet-800">Difficulty</h3>
                    <p className="mt-1 text-slate-700 capitalize">{lesson.difficultyLevel ?? "foundation"}</p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-violet-800">Story</h3>
                    <p className="mt-1 text-slate-700">{lesson.content.storyText}</p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-violet-800">Activity Instructions</h3>
                    <p className="mt-1 text-slate-700">{lesson.content.activityInstructions}</p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-violet-800">Quiz Concept</h3>
                    <p className="mt-1 text-slate-700">{lesson.content.quizConcept}</p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-violet-800">Worksheet Example</h3>
                    <p className="mt-1 text-slate-700">{lesson.content.worksheetExample}</p>
                  </section>
                  <section>
                    <h3 className="font-semibold text-violet-800">Parent Tip</h3>
                    <p className="mt-1 text-slate-700">{lesson.content.parentTip}</p>
                  </section>
                </>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  onClick={() => handleGenerate("story")}
                  disabled={generatingType !== null || !selectedLessonId || (lessonProgress ? !lessonProgress.canAccess : false)}
                >
                  {generatingType === "story" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Story
                </Button>
                <Button
                  onClick={() => handleGenerate("worksheet")}
                  disabled={generatingType !== null || !selectedLessonId || (lessonProgress ? !lessonProgress.canAccess : false)}
                  variant="secondary"
                >
                  {generatingType === "worksheet" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Worksheet
                </Button>
                <Button
                  onClick={() => handleGenerate("quiz")}
                  disabled={generatingType !== null || !selectedLessonId || (lessonProgress ? !lessonProgress.canAccess : false)}
                  variant="outline"
                >
                  {generatingType === "quiz" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Quiz
                </Button>
                {supportsProject && (
                  <>
                    <Button
                      onClick={() => handleGenerate("project")}
                      disabled={generatingType !== null || !selectedLessonId || (lessonProgress ? !lessonProgress.canAccess : false)}
                      variant="secondary"
                    >
                      {generatingType === "project" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Generate Project
                    </Button>
                  </>
                )}
                {supportsReflection && (
                  <>
                    <Button
                      onClick={() => handleGenerate("reflection")}
                      disabled={generatingType !== null || !selectedLessonId || (lessonProgress ? !lessonProgress.canAccess : false)}
                      variant="outline"
                    >
                      {generatingType === "reflection" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Reflection Questions
                    </Button>
                  </>
                )}
                {supportsResearch && (
                  <Button
                    onClick={() => handleGenerate("research")}
                    disabled={generatingType !== null || !selectedLessonId || (lessonProgress ? !lessonProgress.canAccess : false)}
                    variant="secondary"
                  >
                    {generatingType === "research" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Research Task
                  </Button>
                )}
                {supportsDebate && (
                  <>
                    <Button
                      onClick={() => handleGenerate("debate")}
                      disabled={generatingType !== null || !selectedLessonId || (lessonProgress ? !lessonProgress.canAccess : false)}
                      variant="outline"
                    >
                      {generatingType === "debate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Debate Mode
                    </Button>
                  </>
                )}
              </div>
              <div className="pt-1">
                <Button
                  onClick={completeCurrentLesson}
                  disabled={!selectedLessonId || (lessonProgress ? !lessonProgress.canAccess : false)}
                  className="bg-[#7F77DD] hover:bg-[#6C63D5]"
                >
                  Mark Lesson Complete
                </Button>
              </div>

              {(generatedContent.story ||
                generatedContent.worksheet ||
                generatedContent.quiz ||
                generatedContent.project ||
                generatedContent.debate ||
                generatedContent.research ||
                generatedContent.reflection) && (
                <div className="space-y-4 pt-2">
                  {(["story", "worksheet", "quiz", "project", "debate", "research", "reflection"] as const).map((type) =>
                    generatedContent[type] ? (
                      <section key={type} className="rounded-lg border bg-amber-50 p-3">
                        <h4 className="font-semibold text-amber-800 capitalize flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Generated {type}
                          {generatedContent[type]!.cached ? (
                            <span className="text-xs font-normal text-amber-700">(cached)</span>
                          ) : null}
                        </h4>
                        {renderGeneratedContent(type, generatedContent[type]!)}
                      </section>
                    ) : null
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generated Worksheets & Quizzes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sharedContent.filter((item) => item.subjectName.toLowerCase() === (subject?.name ?? "").toLowerCase()).length === 0 ? (
              <p className="text-sm text-slate-500">No parent-generated shared content yet.</p>
            ) : (
              sharedContent
                .filter((item) => item.subjectName.toLowerCase() === (subject?.name ?? "").toLowerCase())
                .map((item) => (
                  <div key={item.id} className="rounded-md border bg-slate-50 p-3">
                    <p className="text-sm font-semibold capitalize">
                      {item.contentType} • {item.unitTitle}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{item.content}</p>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Final Subject Exam</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!allLessonsCompleted ? (
              <p className="text-sm text-amber-700">Complete all lessons in this subject to unlock the final exam.</p>
            ) : !examState.exam ? (
              <p className="text-sm text-slate-600">Exam will appear once parent generates it.</p>
            ) : (
              <div className="space-y-3">
                {examState.exam.score != null ? (
                  <p className="text-sm font-medium text-green-700">Submitted. Score: {examState.exam.score.toFixed(2)}%</p>
                ) : (
                  <>
                    {(examState.exam.examJson.mcqs ?? []).map((q, index) => (
                      <div key={`mcq-${index}`} className="rounded border p-3">
                        <p className="text-sm font-medium">{q.question}</p>
                        <Select
                          value={examState.answers.mcqs.find((a) => a.index === index)?.answer ?? ""}
                          onValueChange={(value) =>
                            setExamState((prev) => ({
                              ...prev,
                              answers: {
                                ...prev.answers,
                                mcqs: [
                                  ...prev.answers.mcqs.filter((a) => a.index !== index),
                                  { index, answer: value },
                                ],
                              },
                            }))
                          }
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select answer" />
                          </SelectTrigger>
                          <SelectContent>
                            {q.options.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    {(examState.exam.examJson.shortQuestions ?? []).map((q, index) => (
                      <div key={`short-${index}`} className="rounded border p-3">
                        <p className="text-sm font-medium">{q.question}</p>
                        <textarea
                          className="mt-2 w-full rounded border p-2 text-sm"
                          rows={3}
                          value={examState.answers.shortQuestions.find((a) => a.index === index)?.answer ?? ""}
                          onChange={(e) =>
                            setExamState((prev) => ({
                              ...prev,
                              answers: {
                                ...prev.answers,
                                shortQuestions: [
                                  ...prev.answers.shortQuestions.filter((a) => a.index !== index),
                                  { index, answer: e.target.value },
                                ],
                              },
                            }))
                          }
                        />
                      </div>
                    ))}
                    <Button onClick={submitExam}>Submit Final Exam</Button>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  )
}
