import type { ReactNode } from "react"
import { StudentAssessmentGate } from "@/components/dashboards/student/student-assessment-gate"

export default function StudentLayout({ children }: { children: ReactNode }) {
  return <StudentAssessmentGate>{children}</StudentAssessmentGate>
}
