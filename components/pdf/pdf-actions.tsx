"use client"

import { DownloadButton } from "./download-button"
import { ShareDialog } from "./share-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileDown, MoreVertical, Printer, Share2 } from "lucide-react"
import type { Worksheet, Child, Subject, Progress, AIRecommendation, Assessment } from "@/lib/types"
import { apiFetch } from "@/lib/api-client"

interface WorksheetPDFActionsProps {
  worksheet: Worksheet
  childName?: string
}

export function WorksheetPDFActions({ worksheet, childName }: WorksheetPDFActionsProps) {
  const handlePrint = async () => {
    // Generate PDF and open in new tab for printing
    const response = await apiFetch("/api/pdf/worksheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ worksheet, childName }),
    })
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const printWindow = window.open(url)
    printWindow?.print()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <DownloadButton
            pdfType="worksheet"
            data={{ worksheet, childName }}
            fileName={`${worksheet.title.replace(/\s+/g, "-").toLowerCase()}.pdf`}
            variant="ghost"
            className="w-full justify-start cursor-pointer"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Download Worksheet
          </DownloadButton>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <DownloadButton
            pdfType="answer-key"
            data={{ worksheet }}
            fileName={`${worksheet.title.replace(/\s+/g, "-").toLowerCase()}-answers.pdf`}
            variant="ghost"
            className="w-full justify-start cursor-pointer"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Download Answer Key
          </DownloadButton>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <ShareDialog pdfType="worksheet" data={{ worksheet, childName }} title={worksheet.title}>
            <button className="flex items-center w-full px-2 py-1.5 text-sm">
              <Share2 className="w-4 h-4 mr-2" />
              Share via Email
            </button>
          </ShareDialog>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface AssessmentPDFActionsProps {
  child: Child
  progress: Progress[]
  assessments: Assessment[]
  subjects: Subject[]
}

export function AssessmentPDFActions({ child, progress, assessments, subjects }: AssessmentPDFActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <DownloadButton
        pdfType="assessment"
        data={{ child, progress, assessments, subjects }}
        fileName={`${child.name.replace(/\s+/g, "-").toLowerCase()}-report.pdf`}
      >
        Download Report
      </DownloadButton>
      <ShareDialog
        pdfType="assessment"
        data={{ child, progress, assessments, subjects }}
        title={`${child.name}'s Assessment Report`}
      />
    </div>
  )
}

interface CurriculumPDFActionsProps {
  subjects: Subject[]
  ageGroup: string
  childName?: string
}

export function CurriculumPDFActions({ subjects, ageGroup, childName }: CurriculumPDFActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <DownloadButton
        pdfType="curriculum"
        data={{ subjects, ageGroup, childName }}
        fileName={`curriculum-${ageGroup}-years.pdf`}
      >
        Download Curriculum
      </DownloadButton>
      <ShareDialog
        pdfType="curriculum"
        data={{ subjects, ageGroup, childName }}
        title={`Curriculum Guide (${ageGroup} years)`}
      />
    </div>
  )
}

interface RecommendationsPDFActionsProps {
  childName: string
  recommendations: AIRecommendation[]
}

export function RecommendationsPDFActions({ childName, recommendations }: RecommendationsPDFActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <DownloadButton
        pdfType="recommendations"
        data={{ childName, recommendations }}
        fileName={`${childName.replace(/\s+/g, "-").toLowerCase()}-recommendations.pdf`}
      >
        Download Recommendations
      </DownloadButton>
      <ShareDialog
        pdfType="recommendations"
        data={{ childName, recommendations }}
        title={`${childName}'s Learning Recommendations`}
      />
    </div>
  )
}
