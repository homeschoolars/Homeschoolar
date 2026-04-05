"use client"

import { useEffect, useMemo, useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { apiFetch } from "@/lib/api-client"
import type { Difficulty } from "@/lib/types"

type CurriculumSubjectSummary = {
  id: string
  name: string
  units?: Array<{ id: string; title: string }>
}

type CurriculumLesson = {
  id: string
  title: string
  slug: string
  displayOrder?: number
}

type CurriculumUnitFull = {
  id: string
  title: string
  lessons: CurriculumLesson[]
}

type CurriculumSubjectDetail = {
  id: string
  name: string
  units: CurriculumUnitFull[]
}

type LessonWorksheetAssignerProps = {
  childId: string
  ageGroup: string
  onAssigned?: () => void
}

export function LessonWorksheetAssigner({ childId, ageGroup, onAssigned }: LessonWorksheetAssignerProps) {
  const [subjects, setSubjects] = useState<CurriculumSubjectSummary[]>([])
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [subjectId, setSubjectId] = useState("")
  const [detail, setDetail] = useState<CurriculumSubjectDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [unitId, setUnitId] = useState("")
  const [lessonId, setLessonId] = useState("")
  const [topic, setTopic] = useState("")
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [numQuestions, setNumQuestions] = useState(5)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ageGroup) return
    let cancelled = false
    const load = async () => {
      setSubjectsLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/curriculum/subjects?ageGroup=${encodeURIComponent(ageGroup)}`)
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? "Failed to load subjects")
        }
        const payload = (await res.json()) as { subjects: CurriculumSubjectSummary[] }
        if (!cancelled) {
          setSubjects(payload.subjects ?? [])
          setSubjectId("")
          setUnitId("")
          setLessonId("")
          setDetail(null)
        }
      } catch (e) {
        if (!cancelled) {
          setSubjects([])
          setError(e instanceof Error ? e.message : "Failed to load curriculum")
        }
      } finally {
        if (!cancelled) setSubjectsLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [ageGroup])

  useEffect(() => {
    if (!subjectId || !ageGroup) {
      setDetail(null)
      setUnitId("")
      setLessonId("")
      return
    }
    let cancelled = false
    const load = async () => {
      setDetailLoading(true)
      setError(null)
      try {
        const res = await apiFetch(
          `/api/curriculum/subjects/${encodeURIComponent(subjectId)}?ageGroup=${encodeURIComponent(ageGroup)}`,
        )
        if (!res.ok) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(payload.error ?? "Failed to load subject")
        }
        const payload = (await res.json()) as { subject: CurriculumSubjectDetail }
        if (!cancelled) {
          setDetail(payload.subject)
          const firstUnit = payload.subject.units[0]
          setUnitId(firstUnit?.id ?? "")
          const firstLesson = firstUnit?.lessons[0]
          setLessonId(firstLesson?.id ?? "")
        }
      } catch (e) {
        if (!cancelled) {
          setDetail(null)
          setError(e instanceof Error ? e.message : "Failed to load subject detail")
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [subjectId, ageGroup])

  const lessonsInUnit = useMemo(() => {
    if (!detail || !unitId) return []
    const unit = detail.units.find((u) => u.id === unitId)
    return unit?.lessons ?? []
  }, [detail, unitId])

  const assignWorksheet = async () => {
    if (!lessonId) {
      setMessage(null)
      setError("Select a lesson.")
      return
    }
    setBusy(true)
    setMessage(null)
    setError(null)
    try {
      const res = await apiFetch(`/api/parent/children/${encodeURIComponent(childId)}/generate-worksheet-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          curriculumLessonId: lessonId,
          topic: topic.trim() || undefined,
          difficulty,
          numQuestions: Math.min(20, Math.max(3, numQuestions)),
        }),
      })
      const payload = (await res.json().catch(() => ({}))) as { error?: string; assignment?: { id: string } }
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to generate worksheet")
      }
      setMessage("Worksheet created and assigned. Your child will see it on their dashboard and in the lesson path.")
      onAssigned?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base tracking-tight text-slate-800 flex items-center gap-2">
          <FileText className="h-5 w-5 text-sky-600" />
          Assign lesson worksheet
        </CardTitle>
        <CardDescription>
          Generates an AI worksheet and links it to a curriculum lesson so it counts toward your child&apos;s lesson path
          (gate: required worksheet count).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {subjectsLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading curriculum for {ageGroup}…
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Curriculum subject</Label>
                <Select
                  value={subjectId || "none"}
                  onValueChange={(v) => setSubjectId(v === "none" ? "" : v)}
                  disabled={subjects.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select subject
                    </SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unit / topic</Label>
                <Select
                  value={unitId || "none"}
                  onValueChange={(v) => {
                    const next = v === "none" ? "" : v
                    setUnitId(next)
                    const unit = detail?.units.find((u) => u.id === next)
                    setLessonId(unit?.lessons[0]?.id ?? "")
                  }}
                  disabled={!detail || detail.units.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select unit
                    </SelectItem>
                    {(detail?.units ?? []).map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lesson</Label>
                <Select
                  value={lessonId || "none"}
                  onValueChange={(v) => setLessonId(v === "none" ? "" : v)}
                  disabled={!unitId || lessonsInUnit.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select lesson" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Select lesson
                    </SelectItem>
                    {lessonsInUnit.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {detailLoading ? (
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading lessons…
              </p>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Number of questions</Label>
                <Input
                  type="number"
                  min={3}
                  max={20}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number.parseInt(e.target.value || "5", 10) || 5)}
                />
              </div>
            </div>

            <div>
              <Label>Topic focus (optional)</Label>
              <Textarea
                placeholder="e.g. Practice fractions from this lesson"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            <Button type="button" onClick={() => void assignWorksheet()} disabled={busy || !lessonId}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              Generate &amp; assign worksheet
            </Button>

            {message ? <p className="text-sm text-teal-800">{message}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
