"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, ChevronLeft, Circle, ListVideo, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-client"
import { getSiteBranding } from "@/lib/site-branding"
import { AdaptiveQuizPlayer, type AdaptiveQuizQuestion } from "@/components/learning/adaptive-quiz-player"
import { AdaptiveStoryReader } from "@/components/learning/adaptive-story-reader"
import { AdaptiveWorksheetViewer, type WorksheetViewModel } from "@/components/learning/adaptive-worksheet-viewer"

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
  level?: { id: string; name: string; stageName: string } | null
}

type LessonDetailResponse = {
  lesson: {
    id: string
    title: string
    slug?: string
    difficultyLevel?: string
    locked?: boolean
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

type WorksheetActivityStructured =
  | { type: "mcq"; question: string; options: string[]; correctAnswer: string }
  | { type: "short_answer"; question: string; hint: string | null }
  | { type: "fill_in_blank"; prompt: string; answers: string[] }
  | {
      type: "match"
      leftColumn: string[]
      rightColumn: string[]
      correctPairs: { left: string; right: string }[]
    }

type WorksheetContent = {
  title: string
  instructions: string
  activities: string[] | WorksheetActivityStructured[]
}

function getAgeStart(ageGroup: string) {
  const first = ageGroup.split("-")[0]
  const parsed = Number.parseInt(first, 10)
  return Number.isFinite(parsed) ? parsed : 4
}

function isStructuredWorksheetActivity(item: unknown): item is WorksheetActivityStructured {
  if (!item || typeof item !== "object") return false
  const o = item as Record<string, unknown>
  if (o.type === "mcq") {
    return (
      typeof o.question === "string" &&
      Array.isArray(o.options) &&
      o.options.length === 4 &&
      o.options.every((x) => typeof x === "string") &&
      typeof o.correctAnswer === "string"
    )
  }
  if (o.type === "short_answer") {
    return typeof o.question === "string"
  }
  if (o.type === "fill_in_blank") {
    return typeof o.prompt === "string" && Array.isArray(o.answers) && o.answers.length > 0 && o.answers.every((x) => typeof x === "string")
  }
  if (o.type === "match") {
    return (
      Array.isArray(o.leftColumn) &&
      Array.isArray(o.rightColumn) &&
      o.leftColumn.every((x) => typeof x === "string") &&
      o.rightColumn.every((x) => typeof x === "string") &&
      Array.isArray(o.correctPairs) &&
      o.correctPairs.every(
        (p) =>
          p &&
          typeof p === "object" &&
          typeof (p as { left?: unknown }).left === "string" &&
          typeof (p as { right?: unknown }).right === "string",
      )
    )
  }
  return false
}

function isWorksheetContent(value: unknown): value is WorksheetContent {
  if (!value || typeof value !== "object") return false
  const payload = value as Record<string, unknown>
  if (typeof payload.title !== "string" || typeof payload.instructions !== "string" || !Array.isArray(payload.activities)) {
    return false
  }
  if (payload.activities.length === 0) return false
  const first = payload.activities[0]
  if (typeof first === "string") {
    return payload.activities.every((item) => typeof item === "string")
  }
  return payload.activities.every((item) => isStructuredWorksheetActivity(item))
}

function getStudentChildId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem("student_child")
    if (!raw) return null
    const parsed = JSON.parse(raw) as { id?: string }
    return parsed.id ?? null
  } catch {
    return null
  }
}

function isAdaptiveQuizJson(json: unknown): json is { questions: AdaptiveQuizQuestion[] } {
  if (!json || typeof json !== "object") return false
  const qs = (json as { questions?: unknown }).questions
  if (!Array.isArray(qs) || qs.length === 0) return false
  return qs.every((item) => {
    if (!item || typeof item !== "object") return false
    const q = item as Record<string, unknown>
    return (
      typeof q.question === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      q.options.every((o) => typeof o === "string") &&
      typeof q.correctAnswer === "string"
    )
  })
}

function LessonPdfLinks(props: {
  lessonId: string | null
  childId: string | null
  contentType: "quiz" | "worksheet" | "story"
}) {
  const { lessonId, childId, contentType } = props
  if (!lessonId || !childId) return null
  const base = `/api/pdf/download?lessonId=${encodeURIComponent(lessonId)}&childId=${encodeURIComponent(childId)}&contentType=${encodeURIComponent(contentType)}`
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={base} target="_blank" rel="noopener noreferrer">
          Download PDF
        </a>
      </Button>
      {contentType === "quiz" ? (
        <Button variant="secondary" size="sm" asChild>
          <a href={`${base}&answerKey=1`} target="_blank" rel="noopener noreferrer">
            PDF + answer key
          </a>
        </Button>
      ) : null}
    </div>
  )
}

export function SubjectLessonClient({ subjectId }: { subjectId: string }) {
  const [studentId, setStudentId] = useState("")
  const [internalAgeBand, setInternalAgeBand] = useState("4-5")
  const [levelLabel, setLevelLabel] = useState("")
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
      contentType: "quiz" | "worksheet" | "story"
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

  type LessonFlowState = {
    lectures: Array<{ id: string; title: string; orderIndex: number; completed: boolean }>
    requiredWorksheetCount: number
    worksheetsCompleted: number
    worksheetsComplete: boolean
    quizPassed: boolean
    hasQuizPrompt: boolean
    lecturesComplete: boolean
    assignments: Array<{ id: string; status: string; worksheetId: string; worksheetTitle: string }>
  }

  const [lessonFlow, setLessonFlow] = useState<LessonFlowState | null>(null)
  const [flowLoading, setFlowLoading] = useState(false)
  const [completingLectureId, setCompletingLectureId] = useState<string | null>(null)

  const siteBrand = useMemo(() => getSiteBranding(), [])

  useEffect(() => {
    const raw = sessionStorage.getItem("student_child")
    if (!raw) {
      setLoading(false)
      setError("Please sign in as a student to view this subject.")
      return
    }
    try {
      const parsed = JSON.parse(raw) as { id?: string; age_group?: string; learning_class?: string }
      if (!parsed.id) {
        setLoading(false)
        setError("Student session missing. Please sign in again.")
        return
      }
      setStudentId(parsed.id)
      if (parsed.age_group) setInternalAgeBand(parsed.age_group)
      if (parsed.learning_class) setLevelLabel(parsed.learning_class)
    } catch {
      setLoading(false)
      setError("Invalid student session. Please sign in again.")
    }
  }, [])

  useEffect(() => {
    if (!studentId) return

    const fetchSubject = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(
          `/api/curriculum/subjects/${encodeURIComponent(subjectId)}?studentId=${encodeURIComponent(studentId)}`,
        )
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? "Unable to load curriculum subject")
        }
        const data = (await res.json()) as CurriculumSubjectResponse
        setSubject(data.subject)
        if (data.level?.stageName) {
          setLevelLabel(data.level.stageName)
        } else if (data.level?.name) {
          setLevelLabel(data.level.name)
        }
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
  }, [subjectId, studentId])

  useEffect(() => {
    if (!selectedLessonId) return
    const fetchLesson = async () => {
      setLessonLoading(true)
      try {
        const raw = sessionStorage.getItem("student_child")
        const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
        if (!childId) {
          throw new Error("Student session missing")
        }
        const res = await apiFetch(
          `/api/curriculum/lessons/${encodeURIComponent(selectedLessonId)}?childId=${encodeURIComponent(childId)}`,
        )
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

  useEffect(() => {
    if (!selectedLessonId || lessonLoading || !lesson || lesson.locked || !lessonProgress?.canAccess) {
      setLessonFlow(null)
      setFlowLoading(false)
      return
    }
    const raw = sessionStorage.getItem("student_child")
    const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
    if (!childId) return

    const loadFlow = async () => {
      setFlowLoading(true)
      try {
        const res = await apiFetch(
          `/api/student/lesson-flow?childId=${encodeURIComponent(childId)}&lessonId=${encodeURIComponent(selectedLessonId)}`,
        )
        const payload = (await res.json()) as { success?: boolean; data?: LessonFlowState; error?: string }
        if (!res.ok || !payload.success || !payload.data) {
          throw new Error(payload.error ?? "Failed to load lesson flow")
        }
        setLessonFlow(payload.data)
      } catch {
        setLessonFlow(null)
      } finally {
        setFlowLoading(false)
      }
    }
    void loadFlow()
  }, [selectedLessonId, lesson, lessonLoading, lessonProgress?.canAccess])

  const selectedUnit = useMemo(
    () => subject?.units.find((unit) => unit.id === selectedUnitId) ?? null,
    [subject, selectedUnitId]
  )

  const ageStart = getAgeStart(internalAgeBand)
  /** AI self-serve buttons: age > 7 (aligned with API). */
  const supportsStudentAiGeneration = ageStart >= 8
  const supportsProject = ageStart >= 8
  const supportsResearch = ageStart >= 10
  const supportsDebate = ageStart >= 11
  const supportsReflection = ageStart >= 10
  const allLessonsCompleted = lessonProgress ? lessonProgress.lessons.length > 0 && lessonProgress.lessons.every((l) => l.status === "completed") : false

  const disableStudentAi =
    generatingType !== null ||
    !selectedLessonId ||
    (lessonProgress ? !lessonProgress.canAccess : false) ||
    Boolean(lesson?.locked) ||
    !supportsStudentAiGeneration

  const lecturesBlockWorksheet =
    Boolean(lessonFlow && lessonFlow.lectures.length > 0 && !lessonFlow.lecturesComplete)

  const disableWorksheetAi = disableStudentAi || lecturesBlockWorksheet

  const refreshProgress = async () => {
    const raw = sessionStorage.getItem("student_child")
    const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
    if (!childId || !selectedLessonId) return
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
    }
    if (res.ok && payload.data) {
      setLessonProgress(payload.data)
    }
  }

  const completeLecture = async (lectureId: string) => {
    const raw = sessionStorage.getItem("student_child")
    const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
    if (!childId || !selectedLessonId) return
    setCompletingLectureId(lectureId)
    try {
      const res = await apiFetch(`/api/curriculum/lectures/${encodeURIComponent(lectureId)}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId }),
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? "Could not mark lecture complete")
      }
      const flowRes = await apiFetch(
        `/api/student/lesson-flow?childId=${encodeURIComponent(childId)}&lessonId=${encodeURIComponent(selectedLessonId)}`,
      )
      const flowPayload = (await flowRes.json()) as { success?: boolean; data?: LessonFlowState }
      if (flowRes.ok && flowPayload.success && flowPayload.data) {
        setLessonFlow(flowPayload.data)
      }
      await refreshProgress()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lecture update failed")
    } finally {
      setCompletingLectureId(null)
    }
  }

  const handleGenerate = async (type: GenerationType, options?: { forceRegenerate?: boolean }) => {
    if (!selectedLessonId) return
    if (lessonProgress && !lessonProgress.canAccess) return
    if (lesson?.locked) return
    if (!supportsStudentAiGeneration) return
    setGeneratingType(type)
    try {
      const raw = sessionStorage.getItem("student_child")
      const childId = raw ? ((JSON.parse(raw) as { id?: string }).id ?? "") : ""
      const res = await apiFetch(`/api/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: selectedLessonId,
          contentType: type,
          childId,
          forceRegenerate: Boolean(options?.forceRegenerate),
        }),
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
    const childId = getStudentChildId()
    const lessonId = selectedLessonId

    if (type === "story" && generated.json && typeof generated.json === "object" && "story" in generated.json) {
      const story = (generated.json as { story?: string }).story
      if (typeof story === "string" && story.trim()) {
        return (
          <div className="mt-2 space-y-2">
            <AdaptiveStoryReader story={story} />
            <LessonPdfLinks lessonId={lessonId} childId={childId} contentType="story" />
          </div>
        )
      }
    }

    if (type === "worksheet" && isWorksheetContent(generated.json)) {
      const w = generated.json as WorksheetViewModel
      return (
        <div className="mt-2 space-y-2">
          <AdaptiveWorksheetViewer worksheet={w} />
          <LessonPdfLinks lessonId={lessonId} childId={childId} contentType="worksheet" />
        </div>
      )
    }

    if (type === "quiz" && isAdaptiveQuizJson(generated.json) && childId && lessonId) {
      return (
        <div className="mt-2 space-y-2">
          <AdaptiveQuizPlayer
            lessonId={lessonId}
            childId={childId}
            questions={generated.json.questions}
            timeLimitSeconds={300}
            onSubmitted={() => void refreshProgress()}
          />
          <LessonPdfLinks lessonId={lessonId} childId={childId} contentType="quiz" />
        </div>
      )
    }

    if (type === "quiz" && isAdaptiveQuizJson(generated.json) && (!childId || !lessonId)) {
      return <p className="mt-2 text-sm text-amber-800">Sign in as a student to take this quiz interactively.</p>
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

      <div className="mb-4 flex flex-col items-end gap-0.5">
        <Image src={siteBrand.logoSrc} alt={`${siteBrand.appName} logo`} width={120} height={40} className="h-10 w-auto" />
        <p className="text-right text-xs font-semibold text-violet-900">{siteBrand.appName}</p>
        <p className="max-w-xs text-right text-[11px] text-slate-600">{siteBrand.tagline}</p>
      </div>

      {error && (
        <Card className="mb-4 border-red-300">
          <CardContent className="pt-6 text-red-700 text-sm">{error}</CardContent>
        </Card>
      )}

      {!subject ? (
        <Card>
          <CardContent className="pt-6">No curriculum found for this subject at your level.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-semibold text-slate-800">
                Level: <span className="font-medium text-violet-800">{levelLabel || "—"}</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Your band is set from your profile at signup — it isn&apos;t changed here.</p>
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
                {levelLabel ? <span className="text-sm font-normal text-slate-500">({levelLabel})</span> : null}
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

              {!lessonLoading && lesson?.locked && (
                <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-800">{lesson.title}</p>
                  <p className="mt-2">Content is locked until you reach this lesson in order.</p>
                </section>
              )}

              {!lessonLoading && lessonProgress?.canAccess && !lesson?.locked && (flowLoading || lessonFlow) && (
                <section className="rounded-lg border border-violet-200 bg-violet-50/90 p-4 space-y-3">
                  <h3 className="font-semibold text-violet-900 flex items-center gap-2 text-base">
                    <ListVideo className="h-4 w-4 shrink-0" />
                    Lesson path
                  </h3>
                  {flowLoading ? (
                    <div className="flex items-center gap-2 text-sm text-violet-800">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading steps…
                    </div>
                  ) : lessonFlow ? (
                    <div className="space-y-4 text-sm">
                      {lessonFlow.lectures.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 mb-2">1. Lectures</p>
                          <ul className="space-y-2">
                            {lessonFlow.lectures.map((lec) => (
                              <li
                                key={lec.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/95 px-3 py-2 border border-violet-100"
                              >
                                <span className="flex items-center gap-2 text-slate-800">
                                  {lec.completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-hidden />
                                  ) : (
                                    <Circle className="h-4 w-4 text-slate-400 shrink-0" aria-hidden />
                                  )}
                                  {lec.title}
                                </span>
                                {!lec.completed ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    disabled={completingLectureId === lec.id}
                                    onClick={() => void completeLecture(lec.id)}
                                  >
                                    {completingLectureId === lec.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      "Mark done"
                                    )}
                                  </Button>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-600">No lectures for this lesson — you can skip to worksheets.</p>
                      )}

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 mb-1">2. Worksheets</p>
                        <p className="text-slate-700">
                          Progress: {lessonFlow.worksheetsCompleted} / {lessonFlow.requiredWorksheetCount}
                          {lessonFlow.requiredWorksheetCount === 0 ? " (none required for this lesson)" : ""}
                        </p>
                        {lessonFlow.requiredWorksheetCount > 0 ? (
                          <div className="mt-2">
                            <Progress
                              value={Math.min(100, (lessonFlow.worksheetsCompleted / lessonFlow.requiredWorksheetCount) * 100)}
                              className="h-2 rounded-full"
                            />
                          </div>
                        ) : null}
                        {lessonFlow.assignments.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {lessonFlow.assignments.map((a) => (
                              <li key={a.id} className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/student/worksheet/${a.id}`}
                                  className="text-violet-700 font-medium underline-offset-2 hover:underline"
                                >
                                  {a.worksheetTitle}
                                </Link>
                                <span className="text-slate-500"> — {a.status.replace("_", " ")}</span>
                                {a.status !== "completed" ? (
                                  <Button size="sm" variant="secondary" className="h-7 text-xs" asChild>
                                    <Link href={`/student/worksheet/${a.id}`}>Resume</Link>
                                  </Button>
                                ) : (
                                  <span className="text-xs font-medium text-emerald-700">Done</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : lessonFlow.requiredWorksheetCount > 0 ? (
                          <p className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                            Your parent needs to assign worksheets linked to this lesson. They can generate one from the
                            parent dashboard using this lesson.
                          </p>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 mb-1">3. Quiz</p>
                        <p className="text-slate-700">
                          {lessonFlow.hasQuizPrompt
                            ? lessonFlow.quizPassed
                              ? "Quiz passed ✓"
                              : "Pass the lesson quiz (submit via your quiz activity) after steps 1–2."
                            : "This lesson has no quiz prompt — use “Mark lesson complete” when steps above are satisfied."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">Could not load lesson steps.</p>
                  )}
                </section>
              )}

              {!lessonLoading && lesson?.content && !lesson.locked && (
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

              <p className="text-xs text-slate-500 pt-1">
                Story, worksheet, and quiz are generated with AI once per lesson and saved for you. Use{" "}
                <span className="font-medium text-slate-700">New AI version</span> under a generated item to replace it with
                fresh AI output.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  onClick={() => handleGenerate("story")}
                  disabled={disableStudentAi}
                >
                  {generatingType === "story" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Story
                </Button>
                <Button
                  onClick={() => handleGenerate("worksheet")}
                  disabled={disableWorksheetAi}
                  variant="secondary"
                  title={lecturesBlockWorksheet ? "Finish all lectures before generating a worksheet." : undefined}
                >
                  {generatingType === "worksheet" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Worksheet
                </Button>
                <Button
                  onClick={() => handleGenerate("quiz")}
                  disabled={disableStudentAi}
                  variant="outline"
                >
                  {generatingType === "quiz" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Quiz
                </Button>
                {supportsProject && (
                  <>
                    <Button
                      onClick={() => handleGenerate("project")}
                      disabled={disableStudentAi}
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
                      disabled={disableStudentAi}
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
                    disabled={disableStudentAi}
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
                      disabled={disableStudentAi}
                      variant="outline"
                    >
                      {generatingType === "debate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Debate Mode
                    </Button>
                  </>
                )}
              </div>
              <div className="pt-1 space-y-1">
                <Button
                  onClick={completeCurrentLesson}
                  disabled={
                    !selectedLessonId ||
                    (lessonProgress ? !lessonProgress.canAccess : false) ||
                    lessonFlow?.hasQuizPrompt === true
                  }
                  className="bg-[#7F77DD] hover:bg-[#6C63D5]"
                  title={
                    lessonFlow?.hasQuizPrompt
                      ? "Lessons with a quiz are completed when you pass the quiz."
                      : undefined
                  }
                >
                  Mark Lesson Complete
                </Button>
                {lessonFlow?.hasQuizPrompt ? (
                  <p className="text-xs text-slate-500">When a quiz is configured, finishing the quiz completes the lesson.</p>
                ) : null}
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
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <h4 className="font-semibold text-amber-800 capitalize flex flex-wrap items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Generated {type}
                            {generatedContent[type]!.cached ? (
                              <span className="text-xs font-normal text-amber-700">(saved from last visit)</span>
                            ) : null}
                          </h4>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100"
                            disabled={disableStudentAi || generatingType === type}
                            onClick={() => handleGenerate(type, { forceRegenerate: true })}
                          >
                            {generatingType === type ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Regenerating…
                              </>
                            ) : (
                              "New AI version"
                            )}
                          </Button>
                        </div>
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
            <CardTitle>Generated Worksheets, Quizzes & Stories</CardTitle>
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
