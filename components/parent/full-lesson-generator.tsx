"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles } from "lucide-react"
import type { Subject, Difficulty } from "@/lib/types"
import { apiFetch } from "@/lib/api-client"

type LessonResult = {
  lessonPlan: {
    title: string
    objective: string
    duration: string
    materials: string[]
    warmup?: string
    directInstruction: string
    guidedPractice?: string
    independentPractice?: string
    assessmentCheck: string
    homework?: string
    reflectionQuestions?: string[]
    differentiation?: { support: string; onLevel: string; challenge: string }
    parentTips: string[]
  }
  worksheet: { id: string; title: string } | null
  assignment: { id: string } | null
  quiz: { id: string } | null
  warnings?: string[]
}

export function FullLessonGenerator({
  childId,
  subjects,
}: {
  childId: string
  subjects: Subject[]
}) {
  const [subjectId, setSubjectId] = useState("")
  const [lessonTitle, setLessonTitle] = useState("")
  const [lessonObjective, setLessonObjective] = useState("")
  const [durationMinutes, setDurationMinutes] = useState(40)
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")
  const [language, setLanguage] = useState("English")
  const [teachingStyle, setTeachingStyle] = useState("interactive")
  const [worksheetQuestions, setWorksheetQuestions] = useState(6)

  const [includeWarmup, setIncludeWarmup] = useState(true)
  const [includeGuidedPractice, setIncludeGuidedPractice] = useState(true)
  const [includeIndependentPractice, setIncludeIndependentPractice] = useState(true)
  const [includeHomework, setIncludeHomework] = useState(true)
  const [includeReflection, setIncludeReflection] = useState(true)
  const [includeDifferentiation, setIncludeDifferentiation] = useState(true)
  const [assignWorksheetToChild, setAssignWorksheetToChild] = useState(true)
  const [generateQuiz, setGenerateQuiz] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LessonResult | null>(null)

  const canGenerate = subjectId.length > 0 && lessonTitle.trim().length >= 3 && lessonObjective.trim().length >= 3

  const generateFullLesson = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await apiFetch(`/api/parent/children/${encodeURIComponent(childId)}/generate-full-lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          lessonTitle: lessonTitle.trim(),
          lessonObjective: lessonObjective.trim(),
          durationMinutes,
          difficulty,
          language,
          teachingStyle,
          includeWarmup,
          includeGuidedPractice,
          includeIndependentPractice,
          includeHomework,
          includeReflection,
          includeDifferentiation,
          worksheetQuestions,
          assignWorksheetToChild,
          generateQuiz,
        }),
      })
      const data = (await res.json()) as LessonResult & { error?: string }
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate full lesson")
      }
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate full lesson")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600" />
          Full Lesson Generator (Advanced)
        </CardTitle>
        <CardDescription>
          Generate lesson plan + worksheet + quiz in one click with detailed controls.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
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
            <Label>Lesson Title</Label>
            <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="e.g. Fractions Basics" />
          </div>
          <div>
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={10}
              max={180}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number.parseInt(e.target.value || "40", 10))}
            />
          </div>
          <div>
            <Label>Language</Label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} />
          </div>
          <div>
            <Label>Teaching Style</Label>
            <Input value={teachingStyle} onChange={(e) => setTeachingStyle(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Lesson Objective</Label>
          <Textarea
            value={lessonObjective}
            onChange={(e) => setLessonObjective(e.target.value)}
            placeholder="What should the child learn by the end of this lesson?"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeWarmup} onCheckedChange={(v) => setIncludeWarmup(Boolean(v))} /> Include warmup</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeGuidedPractice} onCheckedChange={(v) => setIncludeGuidedPractice(Boolean(v))} /> Include guided practice</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeIndependentPractice} onCheckedChange={(v) => setIncludeIndependentPractice(Boolean(v))} /> Include independent practice</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeHomework} onCheckedChange={(v) => setIncludeHomework(Boolean(v))} /> Include homework</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeReflection} onCheckedChange={(v) => setIncludeReflection(Boolean(v))} /> Include reflection</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={includeDifferentiation} onCheckedChange={(v) => setIncludeDifferentiation(Boolean(v))} /> Include differentiation</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={assignWorksheetToChild} onCheckedChange={(v) => setAssignWorksheetToChild(Boolean(v))} /> Generate + assign worksheet</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={generateQuiz} onCheckedChange={(v) => setGenerateQuiz(Boolean(v))} /> Generate quiz</label>
        </div>

        <div>
          <Label>Worksheet Questions</Label>
          <Input
            type="number"
            min={3}
            max={15}
            value={worksheetQuestions}
            onChange={(e) => setWorksheetQuestions(Number.parseInt(e.target.value || "6", 10))}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button onClick={generateFullLesson} disabled={!canGenerate || loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate Full Lesson
        </Button>

        {result ? (
          <div className="space-y-3 rounded-lg border p-3">
            <h4 className="font-semibold text-slate-800">{result.lessonPlan.title}</h4>
            <p className="text-sm text-slate-700"><strong>Objective:</strong> {result.lessonPlan.objective}</p>
            <p className="text-sm text-slate-700"><strong>Duration:</strong> {result.lessonPlan.duration}</p>
            <p className="text-sm text-slate-700"><strong>Direct Instruction:</strong> {result.lessonPlan.directInstruction}</p>
            {result.lessonPlan.guidedPractice ? <p className="text-sm text-slate-700"><strong>Guided:</strong> {result.lessonPlan.guidedPractice}</p> : null}
            {result.lessonPlan.independentPractice ? <p className="text-sm text-slate-700"><strong>Independent:</strong> {result.lessonPlan.independentPractice}</p> : null}
            <p className="text-sm text-slate-700"><strong>Assessment Check:</strong> {result.lessonPlan.assessmentCheck}</p>

            <div className="text-sm text-slate-700">
              <strong>Generated Assets:</strong>{" "}
              {result.assignment ? "Worksheet assigned" : "No worksheet assignment"} / {result.quiz ? "Quiz generated" : "No quiz"}
            </div>
            {result.warnings?.length ? (
              <ul className="list-disc pl-5 text-xs text-amber-700">
                {result.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
