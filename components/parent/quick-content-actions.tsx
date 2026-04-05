"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles } from "lucide-react"
import type { Subject } from "@/lib/types"
import { apiFetch } from "@/lib/api-client"

export function QuickContentActions({
  childId,
  subjects,
  childAgeGroup,
  onWorksheetCreated,
  onQuizCreated,
}: {
  childId: string
  subjects: Subject[]
  childAgeGroup?: string
  onWorksheetCreated?: () => void
  onQuizCreated?: () => void
}) {
  const [subjectId, setSubjectId] = useState("")
  const [units, setUnits] = useState<Array<{ unitId: string; title: string; isCompleted: boolean; totalLessons: number; completedLessons: number }>>([])
  const [unitId, setUnitId] = useState("")
  const [busy, setBusy] = useState<"worksheet" | "quiz" | "story" | null>(null)
  const [examBusy, setExamBusy] = useState(false)
  const [latestExam, setLatestExam] = useState<{
    id: string
    score: number | null
    completedAt: string | null
    examJson?: { mcqs?: unknown[]; shortQuestions?: unknown[] }
  } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const selectedUnit = units.find((u) => u.unitId === unitId)
  const canGenerateForUnit = Boolean(selectedUnit?.isCompleted)
  const allUnitsCompleted = units.length > 0 && units.every((u) => u.isCompleted)

  const loadUnitCompletion = async (nextSubjectId: string) => {
    try {
      const res = await apiFetch(
        `/api/parent/unit-completion?studentId=${encodeURIComponent(childId)}&subjectId=${encodeURIComponent(nextSubjectId)}`,
      )
      const payload = (await res.json()) as {
        success?: boolean
        data?: {
          units: Array<{ unitId: string; title: string; isCompleted: boolean; totalLessons: number; completedLessons: number }>
        }
        error?: string
      }
      if (!res.ok || !payload.data) throw new Error(payload.error ?? "Failed to load unit completion")
      setUnits(payload.data.units)
      setUnitId(payload.data.units[0]?.unitId ?? "")
    } catch (e) {
      setUnits([])
      setUnitId("")
      setMessage(e instanceof Error ? e.message : "Failed to load unit completion")
    }
  }

  const loadLatestExam = async (nextSubjectId: string) => {
    try {
      const res = await apiFetch(
        `/api/exam/latest?studentId=${encodeURIComponent(childId)}&subjectId=${encodeURIComponent(nextSubjectId)}`,
      )
      const payload = (await res.json()) as {
        success?: boolean
        data?: {
          exam: {
            id: string
            score: number | null
            completedAt: string | null
            examJson?: { mcqs?: unknown[]; shortQuestions?: unknown[] }
          } | null
        }
      }
      if (res.ok && payload.data) {
        setLatestExam(payload.data.exam)
      } else {
        setLatestExam(null)
      }
    } catch {
      setLatestExam(null)
    }
  }

  const generateWorksheet = async () => {
    if (!subjectId || !unitId || !canGenerateForUnit) return
    setBusy("worksheet")
    setMessage(null)
    try {
      const res = await apiFetch(`/api/parent/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: childId,
          subjectId,
          unitId,
          contentType: "worksheet",
        }),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(payload.error ?? "Failed to generate worksheet")
      setMessage("Worksheet generated and shared to student dashboard.")
      onWorksheetCreated?.()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to generate worksheet")
    } finally {
      setBusy(null)
    }
  }

  const generateStory = async () => {
    if (!subjectId || !unitId || !canGenerateForUnit) return
    setBusy("story")
    setMessage(null)
    try {
      const res = await apiFetch(`/api/parent/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: childId,
          subjectId,
          unitId,
          contentType: "story",
        }),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(payload.error ?? "Failed to generate story")
      setMessage("Story generated and shared to student dashboard.")
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to generate story")
    } finally {
      setBusy(null)
    }
  }

  const generateQuiz = async () => {
    if (!subjectId || !unitId || !canGenerateForUnit) return
    setBusy("quiz")
    setMessage(null)
    try {
      const res = await apiFetch(`/api/parent/generate-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: childId,
          subjectId,
          unitId,
          contentType: "quiz",
        }),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(payload.error ?? "Failed to generate quiz")
      setMessage("Quiz generated and shared to student dashboard.")
      onQuizCreated?.()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to generate quiz")
    } finally {
      setBusy(null)
    }
  }

  const generateFinalExam = async () => {
    if (!subjectId || !allUnitsCompleted) return
    setExamBusy(true)
    setMessage(null)
    try {
      const res = await apiFetch("/api/exam/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: childId, subjectId }),
      })
      const payload = (await res.json()) as { success?: boolean; data?: { cached?: boolean }; error?: string }
      if (!res.ok) throw new Error(payload.error ?? "Failed to generate final exam")
      setMessage(payload.data?.cached ? "Using existing final exam." : "Final exam generated.")
      await loadLatestExam(subjectId)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to generate final exam")
    } finally {
      setExamBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600" />
          Quick Worksheet & Quiz
        </CardTitle>
        <CardDescription>Generate interactive content for selected child by subject.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Subject</Label>
          <Select
            value={subjectId}
            onValueChange={(value) => {
              setSubjectId(value)
              void loadUnitCompletion(value)
              void loadLatestExam(value)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Unit</Label>
          <Select value={unitId} onValueChange={setUnitId} disabled={!subjectId || units.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit.unitId} value={unit.unitId}>
                  {unit.title} ({unit.completedLessons}/{unit.totalLessons}) {unit.isCompleted ? "✓" : "🔒"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {subjectId && unitId && !canGenerateForUnit ? (
          <p className="text-xs text-amber-700">Complete all lessons in this unit before generating quiz/worksheet.</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={generateWorksheet} disabled={!subjectId || !unitId || !canGenerateForUnit || busy !== null}>
            {busy === "worksheet" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Worksheet
          </Button>
          <Button variant="secondary" onClick={generateQuiz} disabled={!subjectId || !unitId || !canGenerateForUnit || busy !== null}>
            {busy === "quiz" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Quiz
          </Button>
          <Button variant="outline" onClick={generateStory} disabled={!subjectId || !unitId || !canGenerateForUnit || busy !== null}>
            {busy === "story" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Story
          </Button>
        </div>
        <div className="rounded-md border bg-slate-50 p-3">
          <p className="text-sm font-medium text-slate-700">Final Subject Exam</p>
          <p className="text-xs text-slate-500">
            Unlocked when all units are completed for this subject{childAgeGroup ? ` (${childAgeGroup})` : ""}.
          </p>
          <Button className="mt-2" onClick={generateFinalExam} disabled={!subjectId || !allUnitsCompleted || examBusy}>
            {examBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Final Exam
          </Button>
          {latestExam ? (
            <div className="mt-2 text-xs text-slate-600">
              <p>Latest exam score: {latestExam.score ?? "Not submitted yet"}</p>
              <p>
                Questions: {(latestExam.examJson?.mcqs?.length ?? 0)} MCQs, {(latestExam.examJson?.shortQuestions?.length ?? 0)} short
              </p>
            </div>
          ) : null}
        </div>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </CardContent>
    </Card>
  )
}
