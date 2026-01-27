"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

interface WeeklyAIInsightsProps {
  studentId: string
  studentName: string
}

type Insight = {
  type: "strength" | "weakness" | "improvement" | "recommendation"
  summary: string
  concept_id?: string
  suggested_action?: string
}

export function WeeklyAIInsights({ studentId, studentName }: WeeklyAIInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await apiFetch(`/api/parent/children/${studentId}/assessment-signals`)
        if (!response.ok) {
          throw new Error("Failed to load insights")
        }
        const data = await response.json()
        setInsights(data.signals || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load insights")
      } finally {
        setLoading(false)
      }
    }

    fetchInsights()
    // Refresh weekly
    const interval = setInterval(fetchInsights, 7 * 24 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [studentId])

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "strength":
        return <TrendingUp className="h-5 w-5 text-green-600" />
      case "weakness":
        return <TrendingDown className="h-5 w-5 text-red-600" />
      case "improvement":
        return <TrendingUp className="h-5 w-5 text-blue-600" />
      case "recommendation":
        return <Lightbulb className="h-5 w-5 text-yellow-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />
    }
  }

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "strength":
        return "bg-green-50 border-green-200"
      case "weakness":
        return "bg-red-50 border-red-200"
      case "improvement":
        return "bg-blue-50 border-blue-200"
      case "recommendation":
        return "bg-yellow-50 border-yellow-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getTypeLabel = (type: Insight["type"]) => {
    switch (type) {
      case "strength":
        return "Strength"
      case "weakness":
        return "Area to Improve"
      case "improvement":
        return "Progress"
      case "recommendation":
        return "Recommendation"
      default:
        return "Insight"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5" />
            Weekly AI Insights
          </CardTitle>
          <CardDescription>AI-powered insights for {studentName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5" />
            Weekly AI Insights
          </CardTitle>
          <CardDescription>AI-powered insights for {studentName}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5" />
            Weekly AI Insights
          </CardTitle>
          <CardDescription>AI-powered insights for {studentName}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No insights available yet. Complete some assessments to get AI-powered insights!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkles className="mr-2 h-5 w-5" />
          Weekly AI Insights
        </CardTitle>
        <CardDescription>AI-powered insights for {studentName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {getTypeLabel(insight.type)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mb-2">{insight.summary}</p>
                  {insight.suggested_action && (
                    <div className="mt-2 p-2 bg-white/50 rounded text-xs">
                      <span className="font-medium">💡 Suggestion: </span>
                      {insight.suggested_action}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
