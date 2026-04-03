"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { apiFetch } from "@/lib/api-client"
import { Card, CardContent } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

type WorksheetQuestion = {
  id: string
  type: "multiple_choice" | "text" | "true_false" | "fill_blank"
  question: string
  options?: string[]
  correct_answer: string
  points: number
}

type WorksheetPayload = {
  assignmentId: string
  childId: string
  worksheet: {
    id: string
    title: string
    description: string | null
    questions: WorksheetQuestion[]
  }
}

export default function WorksheetPage({ params }: { params: Promise<{ id: string }> }) {
  const [assignmentId, setAssignmentId] = useState<string>("")
  const [payload, setPayload] = useState<WorksheetPayload | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; maxScore: number; feedback: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      const { id } = await params
      setAssignmentId(id)
      setLoading(true)
      setError(null)
      try {
        const childRaw = sessionStorage.getItem("student_child")
        const child = childRaw ? (JSON.parse(childRaw) as { id?: string }) : null
        const childId = child?.id
        const res = await apiFetch(`/api/student/worksheet/${encodeURIComponent(id)}?childId=${encodeURIComponent(childId ?? "")}`)
        const data = (await res.json()) as WorksheetPayload & { error?: string }
        if (!res.ok) throw new Error(data.error ?? "Failed to load worksheet")
        setPayload(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load worksheet")
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [params])

  const questions = useMemo(() => payload?.worksheet.questions ?? [], [payload])
  const canSubmit = questions.length > 0 && questions.every((q) => (answers[q.id] ?? "").trim().length > 0)

  const submitWorksheet = async () => {
    if (!payload) return
    setSubmitting(true)
    setError(null)
    try {
      const entries = Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer }))
      const res = await apiFetch(`/api/student/worksheet/${encodeURIComponent(assignmentId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: payload.childId,
          answers: entries,
        }),
      })
      const data = (await res.json()) as { error?: string; score: number; maxScore: number; feedback: string }
      if (!res.ok) throw new Error(data.error ?? "Failed to submit worksheet")
      setResult({ score: data.score, maxScore: data.maxScore, feedback: data.feedback })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit worksheet")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-cyan-100 p-8">
      <Button variant="ghost" asChild className="mb-8 hover:bg-white/50">
        <Link href="/student">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="mx-auto mb-4 flex max-w-4xl justify-end">
        <Image src="/homeschoolars-logo-v2.png" alt="HomeSchoolar logo" width={120} height={40} className="h-10 w-auto" />
      </div>

      {loading ? (
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-center shadow-lg">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-600" />
          <p className="mt-2 text-slate-600">Loading worksheet...</p>
        </div>
      ) : error ? (
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-center shadow-lg text-red-700">{error}</div>
      ) : !payload ? (
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-center shadow-lg">Worksheet not found.</div>
      ) : (
        <div className="mx-auto max-w-4xl space-y-4">
          <Card>
            <CardContent className="pt-6">
              <h1 className="text-2xl font-bold text-violet-800">{payload.worksheet.title}</h1>
              <p className="mt-1 text-slate-600">{payload.worksheet.description}</p>
            </CardContent>
          </Card>

          {questions.map((q, index) => (
            <Card key={q.id}>
              <CardContent className="pt-6 space-y-3">
                <p className="font-semibold text-slate-800">
                  Q{index + 1}. {q.question}
                </p>
                {q.type === "multiple_choice" && q.options?.length ? (
                  <RadioGroup
                    value={answers[q.id] ?? ""}
                    onValueChange={(value) => setAnswers((prev) => ({ ...prev, [q.id]: value }))}
                  >
                    {q.options.map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <RadioGroupItem id={`${q.id}-${opt}`} value={opt} />
                        <Label htmlFor={`${q.id}-${opt}`}>{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <input
                    className="w-full rounded-md border p-2"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Type your answer"
                  />
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button onClick={submitWorksheet} disabled={!canSubmit || submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit Worksheet
            </Button>
          </div>

          {result ? (
            <Card>
              <CardContent className="pt-6">
                <p className="font-bold text-violet-800">
                  Score: {result.score}/{result.maxScore}
                </p>
                <p className="mt-2 text-slate-700">{result.feedback}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  )
}
