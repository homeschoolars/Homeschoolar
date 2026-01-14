"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, BookOpen, Target, Sparkles, X, RefreshCw, Loader2 } from "lucide-react"
import type { AIRecommendation } from "@/lib/types"

interface RecommendationsPanelProps {
  childId: string
  childName: string
}

const typeIcons = {
  subject: BookOpen,
  topic: Target,
  worksheet: Sparkles,
  activity: Lightbulb,
}

const typeColors = {
  subject: "bg-purple-100 text-purple-700 border-purple-200",
  topic: "bg-blue-100 text-blue-700 border-blue-200",
  worksheet: "bg-pink-100 text-pink-700 border-pink-200",
  activity: "bg-amber-100 text-amber-700 border-amber-200",
}

export function RecommendationsPanel({ childId, childName }: RecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadRecommendations()
  }, [childId])

  const loadRecommendations = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ai/recommend-curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ child_id: childId }),
      })

      if (response.ok) {
        const data = await response.json()
        setRecommendations(data.recommendations)
      }
    } catch (error) {
      console.error("Error loading recommendations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadRecommendations()
    setIsRefreshing(false)
  }

  const handleDismiss = (index: number) => {
    setRecommendations((prev) => prev.filter((_, i) => i !== index))
  }

  if (isLoading && recommendations.length === 0) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-purple-500 animate-spin mb-4" />
          <p className="text-gray-600">Generating personalized recommendations...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              AI Recommendations
            </CardTitle>
            <CardDescription>Personalized suggestions for {childName}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="bg-white">
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {recommendations.length > 0 ? (
          recommendations.map((rec, index) => {
            const Icon = typeIcons[rec.type]
            return (
              <div key={index} className={`p-4 rounded-lg border-2 ${typeColors[rec.type]} relative group`}>
                <button
                  onClick={() => handleDismiss(index)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{rec.title}</h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {rec.type}
                      </Badge>
                    </div>
                    <p className="text-sm opacity-80">{rec.description}</p>
                    {rec.reason && (
                      <p className="text-xs mt-2 opacity-60">
                        <em>Why: {rec.reason}</em>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No recommendations yet.</p>
            <p className="text-sm text-gray-400">Complete some worksheets to get personalized suggestions!</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
