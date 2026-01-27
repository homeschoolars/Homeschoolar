"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { FileText, BookOpen } from "lucide-react"
import { apiFetch } from "@/lib/api-client"
import type { Subject } from "@/lib/types"

type WorksheetRow = {
  id: string
  title: string
  subject: string
  age_group: string
  difficulty: string
  is_approved: boolean
  is_ai_generated: boolean
  assignments_count: number
  created_at: string
}

type ContentData = {
  subjects: Subject[]
  worksheets: WorksheetRow[]
  quizzes_count: number
}

export function ContentManagement() {
  const [data, setData] = useState<ContentData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch("/api/admin/content")
      .then((r) => r.json())
      .then((d) => setData(d as ContentData))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const subjects = data?.subjects ?? []
  const worksheets = data?.worksheets ?? []
  const quizzes = data?.quizzes_count ?? 0

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-600" />
          Content
        </CardTitle>
        <CardDescription>
          {subjects.length} subjects · {worksheets.length} worksheets · {quizzes} quizzes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Worksheets
          </h4>
          <div className="overflow-x-auto rounded-md border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Assignments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worksheets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-6">
                      No worksheets
                    </TableCell>
                  </TableRow>
                ) : (
                  worksheets.slice(0, 15).map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium max-w-[180px] truncate">{w.title}</TableCell>
                      <TableCell className="text-slate-600">{w.subject}</TableCell>
                      <TableCell>{w.age_group}</TableCell>
                      <TableCell>
                        <Badge variant={w.is_approved ? "default" : "secondary"} className={w.is_approved ? "bg-green-600" : ""}>
                          {w.is_approved ? "Approved" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{w.assignments_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
