"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Trophy, Target, TrendingUp, Clock, Star } from "lucide-react"
import type { Child, Subject } from "@/lib/types"

interface ParentAnalyticsProps {
  children: Child[]
  subjects: Subject[]
}

export function ParentAnalytics({ children, subjects }: ParentAnalyticsProps) {
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id || "")
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const selectedChild = children.find((c) => c.id === selectedChildId)

  // Mock data - in production, fetch from database
  const progressData = [
    { week: "Week 1", score: 65 },
    { week: "Week 2", score: 72 },
    { week: "Week 3", score: 68 },
    { week: "Week 4", score: 78 },
    { week: "Week 5", score: 82 },
    { week: "Week 6", score: 85 },
  ]

  const subjectScores = [
    { subject: "English", score: 85, fullMark: 100 },
    { subject: "Math", score: 72, fullMark: 100 },
    { subject: "Science", score: 78, fullMark: 100 },
    { subject: "Social Studies", score: 68, fullMark: 100 },
    { subject: "Islamic Studies", score: 90, fullMark: 100 },
    { subject: "Life Skills", score: 82, fullMark: 100 },
  ]

  const weeklyActivity = [
    { day: "Mon", worksheets: 3, quizzes: 1 },
    { day: "Tue", worksheets: 2, quizzes: 2 },
    { day: "Wed", worksheets: 4, quizzes: 1 },
    { day: "Thu", worksheets: 2, quizzes: 0 },
    { day: "Fri", worksheets: 3, quizzes: 2 },
    { day: "Sat", worksheets: 1, quizzes: 0 },
    { day: "Sun", worksheets: 0, quizzes: 0 },
  ]

  const achievements = [
    { name: "First Worksheet", earned: true, icon: "📝" },
    { name: "Quiz Master", earned: true, icon: "🏆" },
    { name: "Week Streak", earned: true, icon: "🔥" },
    { name: "Perfect Score", earned: false, icon: "⭐" },
    { name: "Subject Expert", earned: false, icon: "🎓" },
  ]

  useEffect(() => {
    if (selectedChildId) {
      fetchChildProgress()
    }
  }, [selectedChildId])

  const fetchChildProgress = async () => {
    setIsLoading(true)
    // Fetch actual progress data from database
    setIsLoading(false)
  }

  if (children.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">Add a child to view analytics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Child Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Select Child:</label>
        <Select value={selectedChildId} onValueChange={setSelectedChildId}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {children.map((child) => (
              <SelectItem key={child.id} value={child.id}>
                {child.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-teal-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-teal-700">78%</p>
                <p className="text-xs text-gray-500">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-700">24</p>
                <p className="text-xs text-gray-500">Worksheets Done</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">+12%</p>
                <p className="text-xs text-gray-500">Improvement</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-700">5.2h</p>
                <p className="text-xs text-gray-500">This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Progress Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress Over Time</CardTitle>
            <CardDescription>Weekly average scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#14b8a6"
                    strokeWidth={3}
                    dot={{ fill: "#14b8a6", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subject Performance Radar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subject Performance</CardTitle>
            <CardDescription>Scores across all subjects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={subjectScores}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar name="Score" dataKey="score" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.5} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity & Achievements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Activity</CardTitle>
            <CardDescription>Worksheets and quizzes this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="worksheets" fill="#14b8a6" name="Worksheets" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="quizzes" fill="#8b5cf6" name="Quizzes" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" /> Achievements
            </CardTitle>
            <CardDescription>Badges earned by {selectedChild?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {achievements.map((achievement, i) => (
                <div
                  key={i}
                  className={`text-center p-3 rounded-lg ${
                    achievement.earned
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-gray-50 border border-gray-200 opacity-50"
                  }`}
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <p className="text-xs mt-1 font-medium truncate">{achievement.name}</p>
                </div>
              ))}
            </div>

            {/* Subject Progress Bars */}
            <div className="mt-6 space-y-3">
              <h4 className="text-sm font-medium">Subject Mastery</h4>
              {subjectScores.slice(0, 4).map((subject, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{subject.subject}</span>
                    <span className="font-medium">{subject.score}%</span>
                  </div>
                  <Progress value={subject.score} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
