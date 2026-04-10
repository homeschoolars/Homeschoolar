import type { AssessmentReport } from "@prisma/client"

type PromptAssessment = {
  subject: string
  score?: number | null
  strengths?: unknown
  weaknesses?: unknown
}

/** Maps holistic AssessmentReport rows into prompt "assessments" when there are no per-subject Assessment rows. */
export function holisticReportAsPromptAssessments(
  report: Pick<
    AssessmentReport,
    "scores" | "report" | "learnerType" | "interestProfile" | "aptitudeProfile"
  >
): PromptAssessment[] {
  const rows: PromptAssessment[] = []
  const scores = report.scores as Record<string, { pct?: number }> | null
  if (scores && typeof scores === "object") {
    for (const [subject, v] of Object.entries(scores)) {
      if (!subject || subject === "__proto__" || subject === "constructor") continue
      const pct = typeof v?.pct === "number" ? v.pct : null
      rows.push({ subject, score: pct })
    }
  }

  let subjectRecs: Array<{ subject: string; status: string; recommendation: string }> = []
  try {
    const r = report.report as { subjectRecommendations?: typeof subjectRecs } | null
    if (Array.isArray(r?.subjectRecommendations)) subjectRecs = r.subjectRecommendations
  } catch {
    /* ignore malformed report JSON */
  }
  const bySubject = new Map(subjectRecs.map((x) => [x.subject, x]))
  for (const row of rows) {
    const rec = bySubject.get(row.subject)
    if (!rec) continue
    if (rec.status === "strength") row.strengths = [rec.recommendation]
    if (rec.status === "needs-support" || rec.status === "developing") {
      row.weaknesses = [rec.recommendation]
    }
  }

  if (rows.length === 0) {
    rows.push({
      subject: "Holistic assessment",
      score: null,
      strengths: [
        `Learner type: ${report.learnerType}`,
        `Interests: ${report.interestProfile}`,
        `Aptitude: ${report.aptitudeProfile}`,
      ],
    })
  }
  return rows
}
