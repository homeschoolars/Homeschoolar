"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Calendar, BookOpen, CheckCircle, Clock } from "lucide-react"
import type { Child } from "@/lib/types"
import { ParentPageShell } from "@/components/layout/parent-page-shell"

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
    <ParentPageShell title="Worksheets" subtitle="View and manage assigned worksheets" activeNav="worksheets">

        {/* Filters */}
        <Card className="mb-6 border border-slate-200/70 bg-white/80 backdrop-blur-sm shadow-[0_8px_30px_-14px_rgba(15,23,42,0.12)] rounded-2xl">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger className="w-[220px] rounded-xl border-slate-200">
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
              <div className="flex gap-6 ml-auto text-sm">
                <div>
                  <span className="text-slate-500">Pending</span>{" "}
                  <span className="font-bold tabular-nums text-amber-700">{pendingCount}</span>
                </div>
                <div>
                  <span className="text-slate-500">Completed</span>{" "}
                  <span className="font-bold tabular-nums text-emerald-700">{completedCount}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Worksheets List */}
        {filteredAssignments.length === 0 ? (
          <Card className="border border-dashed border-slate-200/80 bg-white/60 rounded-2xl">
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-violet-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2 font-[family-name:var(--font-heading)]">No worksheets found</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {selectedChildId === "all"
                  ? "No worksheets have been assigned yet."
                  : "No worksheets assigned to this child."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAssignments.map((assignment) => (
              <Card
                key={assignment.id}
                className="border border-slate-200/70 bg-white/85 backdrop-blur-sm rounded-2xl shadow-[0_8px_28px_-12px_rgba(15,23,42,0.12)] hover:shadow-[0_12px_36px_-10px_rgba(99,102,241,0.15)] hover:border-violet-200/60 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <BookOpen className="w-5 h-5 text-violet-600 shrink-0" />
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
    </ParentPageShell>
  )
}
