"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, BookOpen, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"
import type { Child } from "@/lib/types"

type Assignment = {
  id: string
  status: string
  assignedAt: Date
  dueDate: Date | null
  worksheet: {
    id: string
    title: string
    subject: {
      name: string
    }
  }
  child: {
    id: string
    name: string
  }
}

interface WorksheetsPageClientProps {
  children: Child[]
  assignments: Assignment[]
}

export default function WorksheetsPageClient({ children, assignments }: WorksheetsPageClientProps) {
  const [selectedChildId, setSelectedChildId] = useState<string>("all")

  const filteredAssignments =
    selectedChildId === "all"
      ? assignments
      : assignments.filter((a) => a.child.id === selectedChildId)

  const pendingCount = filteredAssignments.filter((a) => a.status === "pending").length
  const completedCount = filteredAssignments.filter((a) => a.status === "completed").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Worksheets</h1>
            <p className="text-gray-600 mt-1">View and manage assigned worksheets</p>
          </div>
          <Link href="/parent">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by child" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Children</SelectItem>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-4 ml-auto">
                <div className="text-sm">
                  <span className="text-gray-600">Pending: </span>
                  <span className="font-semibold">{pendingCount}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Completed: </span>
                  <span className="font-semibold">{completedCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Worksheets List */}
        {filteredAssignments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No worksheets found</h3>
              <p className="text-gray-500">
                {selectedChildId === "all"
                  ? "No worksheets have been assigned yet."
                  : "No worksheets assigned to this child."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAssignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <BookOpen className="w-5 h-5 text-teal-600" />
                        <h3 className="text-lg font-semibold">{assignment.worksheet.title}</h3>
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
                      <div className="flex items-center gap-4 text-sm text-gray-600 ml-8">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {assignment.worksheet.subject.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}
                        </span>
                        {assignment.dueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-gray-500">• {assignment.child.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment.status === "completed" && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
