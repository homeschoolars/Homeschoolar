"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, RefreshCw, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

interface PlanItem {
  subjectId: string
  subjectName: string
  currentTopic: string | null
  nextTopics: string[]
  masteryLevel?: number
}

interface CurriculumPlanCardProps {
  childId: string
  childName: string
}

export function CurriculumPlanCard({ childId, childName }: CurriculumPlanCardProps) {
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadPlan = async () => {
    if (!childId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/parent/children/${childId}/curriculum-plan`)
      if (!res.ok) {
        const t = await res.text()
        setError(t || "Failed to load curriculum plan")
        setPlan([])
        return
      }
      const data = (await res.json()) as { plan?: PlanItem[] }
      setPlan(data.plan ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
      setPlan([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPlan()
  }, [childId])

  const handleRegenerate = async () => {
    if (!childId) return
    setIsRegenerating(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/parent/children/${childId}/regenerate-curriculum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = (await res.json()) as { paths?: PlanItem[]; summary?: string; error?: string }
      if (!res.ok) {
        setError(data.error ?? "Failed to regenerate")
        return
      }
      setPlan(data.paths ?? [])
      if (data.summary != null) setSummary(data.summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to regenerate")
    } finally {
      setIsRegenerating(false)
    }
  }

  if (isLoading && plan.length === 0) {
    return (
      <Card className="border-2 border-teal-200">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-teal-500 animate-spin mb-4" />
          <p className="text-gray-600">Loading curriculum plan...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-teal-200">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-teal-600" />
              Curriculum plan
            </CardTitle>
            <CardDescription>Assessment-based plan for {childName}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerate}
            disabled={isRegenerating || plan.length === 0}
            className="bg-white"
          >
            {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Regenerate</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
        )}
        {summary && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{summary}</p>}
        {plan.length === 0 && !error ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No curriculum plan yet. Complete the assessment quiz first.
          </p>
        ) : (
          <div className="space-y-3">
            {plan.map((item) => (
              <div
                key={item.subjectId}
                className="rounded-lg border border-teal-100 bg-teal-50/50 p-3 space-y-1"
              >
                <p className="font-semibold text-teal-800">{item.subjectName}</p>
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">Current:</span> {item.currentTopic || "—"}
                </p>
                {item.nextTopics && item.nextTopics.length > 0 && (
                  <p className="text-sm text-gray-600">
                    <span className="text-gray-500">Next:</span> {item.nextTopics.slice(0, 3).join(" → ")}
                    {item.nextTopics.length > 3 ? " …" : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
