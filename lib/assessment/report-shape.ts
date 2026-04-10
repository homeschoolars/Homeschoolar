import type { AssessmentReportPublic } from "@/lib/assessment/types-ai"

/** Stored AI holistic quiz report JSON (before/after sanitize). */
export function isHolisticReportJson(report: unknown): report is AssessmentReportPublic {
  if (!report || typeof report !== "object") return false
  const r = report as Record<string, unknown>
  const iq = r.iqEstimate
  return Array.isArray(r.subjectScores) && iq != null && typeof iq === "object"
}
