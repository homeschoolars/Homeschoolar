"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Loader2, Sparkles } from "lucide-react"
import type { Subject } from "@/lib/types"
import { apiFetch } from "@/lib/api-client"

export function QuickContentActions({
  childId,
  subjects,
  onWorksheetCreated,
  onQuizCreated,
}: {
  childId: string
  subjects: Subject[]
  onWorksheetCreated?: () => void
  onQuizCreated?: () => void
}) {
  const [subjectId, setSubjectId] = useState("")
  const [topic, setTopic] = useState("")
  const [busy, setBusy] = useState<"worksheet" | "quiz" | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const selectedSubject = subjects.find((s) => s.id === subjectId)

  const generateWorksheet = async () => {
    if (!subjectId) return
    setBusy("worksheet")
    setMessage(null)
    try {
      const res = await apiFetch(`/api/parent/children/${encodeURIComponent(childId)}/generate-worksheet-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          topic: topic.trim() || undefined,
        }),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(payload.error ?? "Failed to generate worksheet")
      setMessage("Worksheet generated and assigned. It is now visible on child dashboard.")
      onWorksheetCreated?.()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to generate worksheet")
    } finally {
      setBusy(null)
    }
  }

  const generateQuiz = async () => {
    if (!subjectId) return
    setBusy("quiz")
    setMessage(null)
    try {
      const res = await apiFetch(`/api/parent/children/${encodeURIComponent(childId)}/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          subjectName: selectedSubject?.name,
          recentTopics: topic.trim() ? [topic.trim()] : undefined,
        }),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(payload.error ?? "Failed to generate quiz")
      setMessage("Quiz generated for this child. It will appear as a surprise quiz in the child dashboard flow.")
      onQuizCreated?.()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to generate quiz")
    } finally {
      setBusy(null)
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
          <Label>Topic (optional)</Label>
          <Input placeholder="e.g. Fractions" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={generateWorksheet} disabled={!subjectId || busy !== null}>
            {busy === "worksheet" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Worksheet
          </Button>
          <Button variant="secondary" onClick={generateQuiz} disabled={!subjectId || busy !== null}>
            {busy === "quiz" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate Quiz
          </Button>
        </div>
        {message ? <p className="text-sm text-slate-600">{message}</p> : null}
      </CardContent>
    </Card>
  )
}
