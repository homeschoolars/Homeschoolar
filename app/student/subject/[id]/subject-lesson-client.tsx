"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiFetch } from "@/lib/api-client"

type CurriculumLesson = {
  id: string
  title: string
  slug: string
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
}

type GenerationType = "story" | "worksheet" | "quiz" | "project" | "debate" | "research" | "reflection"

function getAgeStart(ageGroup: string) {
  const first = ageGroup.split("-")[0]
  const parsed = Number.parseInt(first, 10)
  return Number.isFinite(parsed) ? parsed : 4
}

export function SubjectLessonClient({ subjectId }: { subjectId: string }) {
  const [ageGroup, setAgeGroup] = useState("4-5")
  const [availableAgeGroups, setAvailableAgeGroups] = useState<string[]>([])
  const [sessionKey, setSessionKey] = useState("global")
  const [subject, setSubject] = useState<CurriculumSubjectResponse["subject"] | null>(null)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [lesson, setLesson] = useState<LessonDetailResponse["lesson"] | null>(null)
  const [loading, setLoading] = useState(true)
  const [lessonLoading, setLessonLoading] = useState(false)
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

  useEffect(() => {
    const loadAgeGroups = async () => {
      try {
        const res = await apiFetch("/api/age-groups")
        if (!res.ok) return
        const payload = (await res.json()) as { ageGroups?: Array<{ name: string }> }
        const names = (payload.ageGroups ?? []).map((a) => a.name)
        if (names.length > 0) {
          setAvailableAgeGroups(names)
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
      if (parsed?.id) {
        setSessionKey(`child:${parsed.id}`)
      }
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

  const selectedUnit = useMemo(
    () => subject?.units.find((unit) => unit.id === selectedUnitId) ?? null,
    [subject, selectedUnitId]
  )

  const ageStart = getAgeStart(ageGroup)
  const supportsProject = ageStart >= 8
  const supportsResearch = ageStart >= 10
  const supportsDebate = ageStart >= 11
  const supportsReflection = ageStart >= 10

  const handleGenerate = async (type: GenerationType) => {
    if (!selectedLessonId) return
    setGeneratingType(type)
    try {
      const res = await apiFetch(`/api/curriculum/lessons/${encodeURIComponent(selectedLessonId)}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, sessionKey }),
      })
      const payload = (await res.json()) as { error?: string; content?: string; cached?: boolean }
      if (!res.ok || !payload.content) {
        throw new Error(payload.error ?? "Generation failed")
      }
      setGeneratedContent((prev) => ({
        ...prev,
        [type]: { value: payload.content!, cached: Boolean(payload.cached) },
      }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate content")
    } finally {
      setGeneratingType(null)
    }
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
                      <SelectItem key={age} value={age}>
                        {age}
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
                        {item.title}
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
                <Button onClick={() => handleGenerate("story")} disabled={generatingType !== null || !selectedLessonId}>
                  {generatingType === "story" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Story
                </Button>
                <Button onClick={() => handleGenerate("worksheet")} disabled={generatingType !== null || !selectedLessonId} variant="secondary">
                  {generatingType === "worksheet" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Worksheet
                </Button>
                <Button onClick={() => handleGenerate("quiz")} disabled={generatingType !== null || !selectedLessonId} variant="outline">
                  {generatingType === "quiz" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate Quiz
                </Button>
                {supportsProject && (
                  <>
                    <Button onClick={() => handleGenerate("project")} disabled={generatingType !== null || !selectedLessonId} variant="secondary">
                      {generatingType === "project" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Generate Project
                    </Button>
                  </>
                )}
                {supportsReflection && (
                  <>
                    <Button onClick={() => handleGenerate("reflection")} disabled={generatingType !== null || !selectedLessonId} variant="outline">
                      {generatingType === "reflection" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Reflection Questions
                    </Button>
                  </>
                )}
                {supportsResearch && (
                  <Button onClick={() => handleGenerate("research")} disabled={generatingType !== null || !selectedLessonId} variant="secondary">
                    {generatingType === "research" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Research Task
                  </Button>
                )}
                {supportsDebate && (
                  <>
                    <Button onClick={() => handleGenerate("debate")} disabled={generatingType !== null || !selectedLessonId} variant="outline">
                      {generatingType === "debate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Debate Mode
                    </Button>
                  </>
                )}
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
                        <p className="mt-2 whitespace-pre-wrap text-slate-700">{generatedContent[type]!.value}</p>
                      </section>
                    ) : null
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      )}
    </div>
  )
}
