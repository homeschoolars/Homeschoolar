"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Newspaper, Sparkles, Loader2 } from "lucide-react"
import { apiFetch } from "@/lib/api-client"

type NewsItem = {
  id: string
  title: string
  summary: string
  category: string
  age_band: string
  generated_at: string
}

interface NewsPanelProps {
  ageBand: "4-7" | "8-13"
  isYounger?: boolean // For age-based styling
}

export function NewsPanel({ ageBand, isYounger = false }: NewsPanelProps) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true)
        const response = await apiFetch(`/api/news/current?age_band=${ageBand}`)
        if (!response.ok) {
          throw new Error("Failed to load news")
        }
        const data = await response.json()
        setNews(data.news || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load news")
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
    // Refresh every 6 hours (news auto-refreshes)
    const interval = setInterval(fetchNews, 6 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [ageBand])

  const categoryColors: Record<string, string> = {
    science: "bg-blue-100 text-blue-800",
    nature: "bg-green-100 text-green-800",
    space: "bg-purple-100 text-purple-800",
    animals: "bg-orange-100 text-orange-800",
    technology: "bg-cyan-100 text-cyan-800",
    sports: "bg-red-100 text-red-800",
    culture: "bg-pink-100 text-pink-800",
    achievements: "bg-yellow-100 text-yellow-800",
  }

  if (loading) {
    return (
      <Card className={isYounger ? "border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50" : "border-slate-200"}>
        <CardHeader>
          <CardTitle className={isYounger ? "text-2xl font-bold text-orange-600" : "text-lg"}>
            <Newspaper className="inline mr-2" />
            News for You
          </CardTitle>
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
      <Card className={isYounger ? "border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50" : "border-slate-200"}>
        <CardHeader>
          <CardTitle className={isYounger ? "text-2xl font-bold text-orange-600" : "text-lg"}>
            <Newspaper className="inline mr-2" />
            News for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (news.length === 0) {
    return (
      <Card className={isYounger ? "border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50" : "border-slate-200"}>
        <CardHeader>
          <CardTitle className={isYounger ? "text-2xl font-bold text-orange-600" : "text-lg"}>
            <Newspaper className="inline mr-2" />
            News for You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={isYounger ? "text-lg text-orange-700" : "text-sm text-muted-foreground"}>
            No news available right now. Check back soon!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={isYounger ? "border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg" : "border-slate-200"}>
      <CardHeader>
        <CardTitle className={isYounger ? "text-2xl font-bold text-orange-600 flex items-center" : "text-lg flex items-center"}>
          <Newspaper className={`${isYounger ? "h-6 w-6 mr-2" : "h-4 w-4 mr-2"}`} />
          News for You
          {isYounger && <Sparkles className="h-5 w-5 ml-2 text-yellow-500 animate-pulse" />}
        </CardTitle>
        <CardDescription className={isYounger ? "text-orange-600" : ""}>
          {isYounger ? "🌟 Fun stories just for you!" : "Stay updated with interesting news"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {news.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-lg border ${
              isYounger
                ? "bg-white border-orange-200 hover:border-orange-400 hover:shadow-md transition-all"
                : "border-slate-200 hover:border-slate-300 transition-colors"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className={`font-semibold ${isYounger ? "text-lg text-orange-800" : "text-base"}`}>
                {item.title}
              </h3>
              <Badge
                className={`${categoryColors[item.category] || "bg-gray-100 text-gray-800"} ${
                  isYounger ? "text-xs" : "text-xs"
                }`}
              >
                {item.category}
              </Badge>
            </div>
            <p className={`text-muted-foreground ${isYounger ? "text-base leading-relaxed" : "text-sm"}`}>
              {item.summary}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
