"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BookOpen, TrendingUp, Calendar, CheckCircle, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Child } from "@/lib/types"

type ProgressItem = {
  id: string
  averageScore: number
  completedWorksheets: number
  subject: {
    name: string
  }
}

type Assignment = {
  id: string
  status: string
  assignedAt: Date
  worksheet: {
    title: string
    subject: {
      name: string
    }
  }
}

interface ChildDetailPageClientProps {
  child: Child
  progress: ProgressItem[]
  assignments: Assignment[]
}

export default function ChildDetailPageClient({
  child,
  progress,
  assignments,
}: ChildDetailPageClientProps) {
  const totalWorksheets = progress.reduce((sum, p) => sum + p.completedWorksheets, 0)
  const averageScore =
    progress.length > 0
      ? Math.round(progress.reduce((sum, p) => sum + Number(p.averageScore), 0) / progress.length)
      : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{child.name}</h1>
            <p className="text-gray-600 mt-1">Child profile and progress details</p>
          </div>
          <Link href="/parent">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-600">{averageScore}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Worksheets Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-600">{totalWorksheets}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-600">Age Group</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className="text-lg">{child.age_group}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Progress by Subject */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Progress by Subject
            </CardTitle>
            <CardDescription>Performance across different subjects</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No progress data available yet.</p>
            ) : (
              <div className="space-y-4">
                {progress.map((p) => (
                  <div key={p.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.subject.name}</span>
                      <span className="text-sm text-gray-600">
                        {Math.round(Number(p.averageScore))}% • {p.completedWorksheets} completed
                      </span>
                    </div>
                    <Progress value={Number(p.averageScore)} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Recent Assignments
            </CardTitle>
            <CardDescription>Latest worksheet assignments</CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No assignments yet.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{assignment.worksheet.title}</h4>
                        <Badge
                          variant={assignment.status === "completed" ? "default" : "secondary"}
                          className={
                            assignment.status === "completed"
                              ? "bg-green-500"
                              : assignment.status === "pending"
                                ? "bg-yellow-500"
                                : ""
                          }
                        >
                          {assignment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{assignment.worksheet.subject.name}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(assignment.assignedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {assignment.status === "completed" && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {assignment.status === "pending" && <Clock className="w-5 h-5 text-yellow-500" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
