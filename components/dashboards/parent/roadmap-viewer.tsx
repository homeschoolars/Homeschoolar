"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, RefreshCw, Loader2, TrendingUp, Clock, Target } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

interface RoadmapViewerProps {
  studentId: string
  studentName: string
}

type RoadmapSubject = {
  entry_level: string
  weekly_lessons: number
  teaching_style: string
  difficulty_progression: string[]
  ai_adaptation_strategy: string
  mastery_timeline_weeks: number
}

type RoadmapData = {
  subjects: Record<string, RoadmapSubject>
  summary?: string
}

export function RoadmapViewer({ studentId, studentName }: RoadmapViewerProps) {
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRoadmap = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFetch(`/api/roadmap/${studentId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError("No roadmap found. Generate one to get started.")
        } else {
          throw new Error("Failed to load roadmap")
        }
        setRoadmap(null)
        return
      }
      const data = await response.json()
      setRoadmap(data.roadmap_json as RoadmapData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roadmap")
      setRoadmap(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoadmap()
  }, [studentId])

  const handleRegenerate = async () => {
    try {
      setRegenerating(true)
      setError(null)
      const response = await apiFetch("/api/roadmap/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId }),
      })
      if (!response.ok) {
        throw new Error("Failed to regenerate roadmap")
      }
      await fetchRoadmap()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate roadmap")
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Learning Roadmap
          </CardTitle>
          <CardDescription>Personalized learning path for {studentName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !roadmap) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Learning Roadmap
          </CardTitle>
          <CardDescription>Personalized learning path for {studentName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Roadmap
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!roadmap || !roadmap.subjects) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            Learning Roadmap
          </CardTitle>
          <CardDescription>Personalized learning path for {studentName}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No roadmap available</p>
            <Button onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate Roadmap
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const subjects = Object.entries(roadmap.subjects)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Learning Roadmap
            </CardTitle>
            <CardDescription>Personalized learning path for {studentName}</CardDescription>
          </div>
          <Button onClick={handleRegenerate} disabled={regenerating} variant="outline" size="sm">
            {regenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {roadmap.summary && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">{roadmap.summary}</p>
          </div>
        )}

        <Tabs defaultValue={subjects[0]?.[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
            {subjects.map(([subjectName]) => (
              <TabsTrigger key={subjectName} value={subjectName} className="text-xs">
                {subjectName}
              </TabsTrigger>
            ))}
          </TabsList>

          {subjects.map(([subjectName, subjectData]) => (
            <TabsContent key={subjectName} value={subjectName} className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-900">Entry Level</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {subjectData.entry_level}
                    </Badge>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-900">Weekly Lessons</span>
                    </div>
                    <p className="text-sm font-semibold text-green-900">{subjectData.weekly_lessons}</p>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-purple-600" />
                      <span className="text-xs font-medium text-purple-900">Timeline</span>
                    </div>
                    <p className="text-sm font-semibold text-purple-900">
                      {subjectData.mastery_timeline_weeks} weeks
                    </p>
                  </div>

                  <div className="p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-medium text-orange-900">Style</span>
                    </div>
                    <p className="text-xs text-orange-900 line-clamp-2">{subjectData.teaching_style}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Difficulty Progression</h4>
                  <div className="flex flex-wrap gap-2">
                    {subjectData.difficulty_progression.map((step, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {idx + 1}. {step}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">AI Adaptation Strategy</h4>
                  <p className="text-sm text-indigo-900">{subjectData.ai_adaptation_strategy}</p>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
