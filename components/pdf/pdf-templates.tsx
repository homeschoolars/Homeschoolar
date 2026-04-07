"use client"

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import type { Worksheet, Child, Subject, Progress, AIRecommendation, Assessment, AgeGroup } from "@/lib/types"
import { getLearningClassFromAgeYears, getLearningClassLabelFromApiAgeGroup } from "@/lib/learning-class"

// Register fonts
Font.register({
  family: "Nunito",
  fonts: [
    { src: "https://fonts.gstatic.com/s/nunito/v25/XRXV3I6Li01BKofINeaBTMnFcQ.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/nunito/v25/XRXW3I6Li01BKofA6sOpNeaB.woff2", fontWeight: 700 },
  ],
})

// Colorful kid-friendly styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Nunito",
    backgroundColor: "#FDF4FF",
  },
  header: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#8B5CF6",
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#E9D5FF",
    textAlign: "center",
    marginTop: 5,
  },
  logo: {
    fontSize: 14,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 8,
  },
  section: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E9D5FF",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#7C3AED",
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: "#E9D5FF",
  },
  question: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: "#F5F3FF",
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: "#8B5CF6",
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: 700,
    color: "#8B5CF6",
    marginBottom: 4,
  },
  questionText: {
    fontSize: 11,
    color: "#1F2937",
    marginBottom: 8,
    lineHeight: 1.5,
  },
  options: {
    marginLeft: 15,
  },
  option: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 4,
  },
  answerBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    minHeight: 40,
  },
  answerLabel: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#9CA3AF",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#1F2937",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#DDD6FE",
  },
  badgeText: {
    fontSize: 9,
    color: "#7C3AED",
    fontWeight: 700,
  },
  answerKeyAnswer: {
    fontSize: 11,
    fontWeight: 700,
    color: "#059669",
    marginBottom: 4,
  },
  explanation: {
    fontSize: 10,
    color: "#374151",
    backgroundColor: "#ECFDF5",
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  progressBar: {
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#8B5CF6",
    borderRadius: 5,
  },
  statsCard: {
    padding: 12,
    backgroundColor: "#F5F3FF",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  statValue: {
    fontSize: 24,
    fontWeight: 700,
    color: "#7C3AED",
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
  },
  recommendationCard: {
    padding: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  recommendationTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#92400E",
    marginBottom: 4,
  },
  recommendationDesc: {
    fontSize: 10,
    color: "#78350F",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#8B5CF6",
    padding: 8,
    borderRadius: 4,
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 10,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    color: "#374151",
  },
})

// Worksheet PDF Template
export function WorksheetPDF({
  worksheet,
  childName,
  includeAnswerKey = false,
}: {
  worksheet: Worksheet
  childName?: string
  includeAnswerKey?: boolean
}) {
  const worksheetClassLabel = getLearningClassLabelFromApiAgeGroup(worksheet.age_group as AgeGroup).label

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{worksheet.title}</Text>
          <Text style={styles.headerSubtitle}>{worksheet.description}</Text>
          <Text style={styles.logo}>HomeSchoolar</Text>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student Name:</Text>
            <Text style={styles.infoValue}>{childName || "_________________"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Class:</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{worksheetClassLabel}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Difficulty:</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{worksheet.difficulty.toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        {/* Questions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions</Text>
          {worksheet.questions.map((q, index) => (
            <View key={q.id} style={styles.question}>
              <Text style={styles.questionNumber}>
                Question {index + 1} ({q.points} points)
              </Text>
              <Text style={styles.questionText}>{q.question}</Text>
              {q.type === "multiple_choice" && q.options && (
                <View style={styles.options}>
                  {q.options.map((opt, i) => (
                    <Text key={i} style={styles.option}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </Text>
                  ))}
                </View>
              )}
              {q.type === "true_false" && (
                <View style={styles.options}>
                  <Text style={styles.option}>A. True</Text>
                  <Text style={styles.option}>B. False</Text>
                </View>
              )}
              {(q.type === "text" || q.type === "fill_blank") && (
                <View style={styles.answerBox}>
                  <Text style={styles.answerLabel}>Write your answer here</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Generated by HomeSchoolar - www.homeschoolar.app</Text>
      </Page>

      {/* Answer Key Page (optional) */}
      {includeAnswerKey && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Answer Key</Text>
            <Text style={styles.headerSubtitle}>{worksheet.title}</Text>
            <Text style={styles.logo}>HomeSchoolar</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Answers & Explanations</Text>
            {worksheet.questions.map((q, index) => (
              <View key={q.id} style={styles.question}>
                <Text style={styles.questionNumber}>Question {index + 1}</Text>
                <Text style={styles.questionText}>{q.question}</Text>
                <Text style={styles.answerKeyAnswer}>Answer: {q.correct_answer}</Text>
                {worksheet.explanations?.[index] && (
                  <View style={styles.explanation}>
                    <Text>{worksheet.explanations[index].concept}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          <Text style={styles.footer}>Generated by HomeSchoolar - www.homeschoolar.app</Text>
        </Page>
      )}
    </Document>
  )
}

// Curriculum PDF Template
export function CurriculumPDF({
  subjects,
  ageGroup,
  childName,
  learningClass,
}: {
  subjects: Subject[]
  ageGroup: string
  childName?: string
  learningClass?: string
}) {
  const classTitle =
    learningClass?.trim() ||
    getLearningClassLabelFromApiAgeGroup(ageGroup as AgeGroup).label

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Curriculum Guide</Text>
          <Text style={styles.headerSubtitle}>Class: {classTitle}</Text>
          <Text style={styles.logo}>HomeSchoolar</Text>
        </View>

        {childName && (
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prepared for:</Text>
              <Text style={styles.infoValue}>{childName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subjects Overview</Text>
          {subjects.map((subject, index) => (
            <View key={subject.id} style={styles.statsCard}>
              <Text style={{ fontSize: 14, fontWeight: 700, color: subject.color || "#8B5CF6", marginBottom: 4 }}>
                {index + 1}. {subject.name}
              </Text>
              <Text style={{ fontSize: 10, color: "#6B7280" }}>
                {subject.description || "Comprehensive curriculum designed for this class."}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Generated by HomeSchoolar - www.homeschoolar.app</Text>
      </Page>
    </Document>
  )
}

// Assessment Report PDF Template
export function AssessmentReportPDF({
  child,
  progress,
  assessments,
  subjects,
}: {
  child: Child
  progress: Progress[]
  assessments: Assessment[]
  subjects: Subject[]
}) {
  const totalScore = progress.reduce((sum, p) => sum + p.total_score, 0)
  const avgScore =
    progress.length > 0 ? Math.round(progress.reduce((sum, p) => sum + p.average_score, 0) / progress.length) : 0
  const totalWorksheets = progress.reduce((sum, p) => sum + p.completed_worksheets, 0)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Student Assessment Report</Text>
          <Text style={styles.headerSubtitle}>{child.name}</Text>
          <Text style={styles.logo}>HomeSchoolar</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{child.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Class:</Text>
            <Text style={styles.infoValue}>{child.learning_class}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Level:</Text>
            <Text style={styles.infoValue}>{child.current_level}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Report Date:</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Summary</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={[styles.statsCard, { flex: 1, marginRight: 5 }]}>
              <Text style={styles.statValue}>{avgScore}%</Text>
              <Text style={styles.statLabel}>Average Score</Text>
            </View>
            <View style={[styles.statsCard, { flex: 1, marginHorizontal: 5 }]}>
              <Text style={styles.statValue}>{totalWorksheets}</Text>
              <Text style={styles.statLabel}>Worksheets Done</Text>
            </View>
            <View style={[styles.statsCard, { flex: 1, marginLeft: 5 }]}>
              <Text style={styles.statValue}>{totalScore}</Text>
              <Text style={styles.statLabel}>Total Points</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subject Progress</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Subject</Text>
            <Text style={styles.tableHeaderCell}>Completed</Text>
            <Text style={styles.tableHeaderCell}>Avg Score</Text>
          </View>
          {subjects.map((subject) => {
            const subjectProgress = progress.find((p) => p.subject_id === subject.id)
            return (
              <View key={subject.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>{subject.name.split("(")[0].trim()}</Text>
                <Text style={styles.tableCell}>
                  {subjectProgress?.completed_worksheets || 0} / {subjectProgress?.total_worksheets || 0}
                </Text>
                <Text style={styles.tableCell}>{subjectProgress?.average_score || 0}%</Text>
              </View>
            )
          })}
        </View>

        <Text style={styles.footer}>Generated by HomeSchoolar - www.homeschoolar.app</Text>
      </Page>
    </Document>
  )
}

// Recommendations PDF Template
export function RecommendationsPDF({
  childName,
  recommendations,
}: {
  childName: string
  recommendations: AIRecommendation[]
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Learning Recommendations</Text>
          <Text style={styles.headerSubtitle}>Personalized for {childName}</Text>
          <Text style={styles.logo}>HomeSchoolar</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Generated:</Text>
            <Text style={styles.infoValue}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-Powered Recommendations</Text>
          {recommendations.map((rec, index) => (
            <View key={rec.id} style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>
                {index + 1}. {rec.title}
              </Text>
              {rec.description && <Text style={styles.recommendationDesc}>{rec.description}</Text>}
              {rec.reason && (
                <Text style={{ fontSize: 9, color: "#92400E", marginTop: 4, fontStyle: "italic" }}>
                  Why: {rec.reason}
                </Text>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.footer}>Generated by HomeSchoolar - www.homeschoolar.app</Text>
      </Page>
    </Document>
  )
}

export type InsightsReportData = {
  childName: string
  insights: {
    strengths?: string[]
    weaknesses?: string[]
    weekly_summary?: {
      mastered?: string[]
      improving?: string[]
      needs_attention?: string[]
      try_this_activity?: string
      review_concept?: string
      celebrate?: string
      next_week_preview?: string
    }
  }
  summary?: {
    streak?: number
    worksheetsCompleted?: number
    averageScore?: number
  }
}

export function InsightsReportPDF({ childName, insights, summary }: InsightsReportData) {
  const ws = insights?.weekly_summary
  const improving = ws?.improving ?? insights?.strengths ?? []
  const needsHelp = ws?.needs_attention ?? insights?.weaknesses ?? []
  const celebrate = ws?.celebrate
  const tryActivity = ws?.try_this_activity
  const review = ws?.review_concept
  const mastered = ws?.mastered ?? []
  const nextWeek = ws?.next_week_preview

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Weekly Insights Report</Text>
          <Text style={styles.headerSubtitle}>{childName}</Text>
          <Text style={styles.logo}>HomeSchoolar · {new Date().toLocaleDateString()}</Text>
        </View>

        {summary && (summary.streak != null || summary.worksheetsCompleted != null || summary.averageScore != null) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>At a glance</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              {summary.streak != null && (
                <View style={[styles.statsCard, { flex: 1 }]}>
                  <Text style={styles.statValue}>{summary.streak}</Text>
                  <Text style={styles.statLabel}>Day streak</Text>
                </View>
              )}
              {summary.worksheetsCompleted != null && (
                <View style={[styles.statsCard, { flex: 1 }]}>
                  <Text style={styles.statValue}>{summary.worksheetsCompleted}</Text>
                  <Text style={styles.statLabel}>Worksheets done</Text>
                </View>
              )}
              {summary.averageScore != null && (
                <View style={[styles.statsCard, { flex: 1 }]}>
                  <Text style={styles.statValue}>{summary.averageScore}%</Text>
                  <Text style={styles.statLabel}>Average score</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {(celebrate || tryActivity || review) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key takeaways</Text>
            {celebrate && (
              <View style={{ marginBottom: 8, padding: 10, backgroundColor: "#ECFDF5", borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: "#065F46", marginBottom: 4 }}>Celebrate</Text>
                <Text style={{ fontSize: 10, color: "#047857", lineHeight: 1.4 }}>{celebrate}</Text>
              </View>
            )}
            {tryActivity && (
              <View style={{ marginBottom: 8, padding: 10, backgroundColor: "#FEF3C7", borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: "#92400E", marginBottom: 4 }}>Try at home</Text>
                <Text style={{ fontSize: 10, color: "#78350F", lineHeight: 1.4 }}>{tryActivity}</Text>
              </View>
            )}
            {review && (
              <View style={{ padding: 10, backgroundColor: "#EFF6FF", borderRadius: 6 }}>
                <Text style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", marginBottom: 4 }}>Review</Text>
                <Text style={{ fontSize: 10, color: "#1E3A8A", lineHeight: 1.4 }}>{review}</Text>
              </View>
            )}
          </View>
        )}

        {improving.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Improving in</Text>
            {improving.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4, alignItems: "flex-start" }}>
                <Text style={{ fontSize: 10, color: "#059669", marginRight: 6 }}>•</Text>
                <Text style={{ fontSize: 10, color: "#374151", flex: 1 }}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {needsHelp.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Needs attention</Text>
            {needsHelp.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4, alignItems: "flex-start" }}>
                <Text style={{ fontSize: 10, color: "#D97706", marginRight: 6 }}>•</Text>
                <Text style={{ fontSize: 10, color: "#374151", flex: 1 }}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {mastered.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mastered</Text>
            {mastered.map((s, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4, alignItems: "flex-start" }}>
                <Text style={{ fontSize: 10, color: "#7C3AED", marginRight: 6 }}>•</Text>
                <Text style={{ fontSize: 10, color: "#374151", flex: 1 }}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {nextWeek && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Next week</Text>
            <Text style={{ fontSize: 10, color: "#374151", lineHeight: 1.4 }}>{nextWeek}</Text>
          </View>
        )}

        {!improving.length && !needsHelp.length && !celebrate && !tryActivity && !review && !mastered.length && !nextWeek && (
          <View style={styles.section}>
            <Text style={{ fontSize: 10, color: "#6B7280", fontStyle: "italic" }}>
              Complete an assessment and some activities to see AI insights for {childName}.
            </Text>
          </View>
        )}

        <Text style={styles.footer}>Generated by HomeSchoolar - www.homeschoolar.app</Text>
      </Page>
    </Document>
  )
}

const holBody = { fontSize: 10, color: "#374151", lineHeight: 1.45, marginBottom: 8 }

type HolisticReportShape = {
  learnerType?: string
  interestProfile?: string
  aptitudeProfile?: string
  overallSummary?: string
  strengthsNarrative?: string
  growthNarrative?: string
  personalityInsight?: string
  careerPathways?: string[]
  learningStyleTips?: string[]
  subjectRecommendations?: Array<{ subject: string; status: string; recommendation: string }>
  weeklyPlanSuggestion?: string
  parentMessage?: string
  islamicNote?: string | null
}

/** PDF for parent holistic learning assessment (`assessment_reports` + AI narrative). */
export function HolisticLearningAssessmentPDF({
  childName,
  ageAtAssessment,
  completedAtIso,
  scores,
  report,
}: {
  childName: string
  ageAtAssessment: number
  completedAtIso: string
  scores: Record<string, { pct: number; total: number; max: number }>
  report: Record<string, unknown>
}) {
  const r = report as HolisticReportShape
  const classAtAssessment = getLearningClassFromAgeYears(ageAtAssessment).label
  const completedLabel = new Date(completedAtIso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
  const scoreEntries = Object.entries(scores ?? {})

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Holistic Learning Assessment</Text>
          <Text style={styles.headerSubtitle}>{childName}</Text>
          <Text style={styles.logo}>HomeSchoolar · {completedLabel}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assessment details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Child:</Text>
            <Text style={styles.infoValue}>{childName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Class at assessment:</Text>
            <Text style={styles.infoValue}>{classAtAssessment}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Report generated:</Text>
            <Text style={styles.infoValue}>{completedLabel}</Text>
          </View>
        </View>

        {scoreEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subject snapshot (scores)</Text>
            {scoreEntries.map(([key, v]) => (
              <View key={key} style={{ marginBottom: 6, flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 10, color: "#1F2937", flex: 2 }}>{key}</Text>
                <Text style={{ fontSize: 10, color: "#6B7280" }}>
                  {v.total}/{v.max} ({Math.round(v.pct)}%)
                </Text>
              </View>
            ))}
          </View>
        )}

        {r.learnerType ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learner type</Text>
            <Text style={holBody}>{r.learnerType}</Text>
          </View>
        ) : null}

        {r.interestProfile ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Interest profile</Text>
            <Text style={holBody}>{r.interestProfile}</Text>
          </View>
        ) : null}

        {r.aptitudeProfile ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Aptitude profile</Text>
            <Text style={holBody}>{r.aptitudeProfile}</Text>
          </View>
        ) : null}

        {r.overallSummary ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall summary</Text>
            <Text style={holBody}>{r.overallSummary}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>Generated by HomeSchoolar - www.homeschoolar.app</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Holistic Learning Assessment (continued)</Text>
          <Text style={styles.headerSubtitle}>{childName}</Text>
          <Text style={styles.logo}>HomeSchoolar</Text>
        </View>

        {r.strengthsNarrative ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Strengths</Text>
            <Text style={holBody}>{r.strengthsNarrative}</Text>
          </View>
        ) : null}

        {r.growthNarrative ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Growth areas</Text>
            <Text style={holBody}>{r.growthNarrative}</Text>
          </View>
        ) : null}

        {r.personalityInsight ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personality & learning</Text>
            <Text style={holBody}>{r.personalityInsight}</Text>
          </View>
        ) : null}

        {r.learningStyleTips && r.learningStyleTips.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learning style tips</Text>
            {r.learningStyleTips.map((tip, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4, alignItems: "flex-start" }}>
                <Text style={{ fontSize: 10, color: "#7C3AED", marginRight: 6 }}>•</Text>
                <Text style={{ fontSize: 10, color: "#374151", flex: 1, lineHeight: 1.45 }}>{tip}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {r.careerPathways && r.careerPathways.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Career pathways (exploratory)</Text>
            {r.careerPathways.map((c, i) => (
              <View key={i} style={{ flexDirection: "row", marginBottom: 4, alignItems: "flex-start" }}>
                <Text style={{ fontSize: 10, color: "#059669", marginRight: 6 }}>•</Text>
                <Text style={{ fontSize: 10, color: "#374151", flex: 1, lineHeight: 1.45 }}>{c}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.footer}>Generated by HomeSchoolar - www.homeschoolar.app</Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Holistic Learning Assessment (continued)</Text>
          <Text style={styles.headerSubtitle}>{childName}</Text>
          <Text style={styles.logo}>HomeSchoolar</Text>
        </View>

        {r.subjectRecommendations && r.subjectRecommendations.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subject recommendations</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { flex: 1.2 }]}>Subject</Text>
              <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Note</Text>
            </View>
            {r.subjectRecommendations.map((row, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.2 }]}>{row.subject}</Text>
                <Text style={[styles.tableCell, { flex: 0.8 }]}>{row.status}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{row.recommendation}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {r.weeklyPlanSuggestion ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly plan suggestion</Text>
            <Text style={holBody}>{r.weeklyPlanSuggestion}</Text>
          </View>
        ) : null}

        {r.parentMessage ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message for parents</Text>
            <Text style={holBody}>{r.parentMessage}</Text>
          </View>
        ) : null}

        {r.islamicNote ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Islamic lens</Text>
            <Text style={holBody}>{r.islamicNote}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>Generated by HomeSchoolar - www.homeschoolar.app</Text>
      </Page>
    </Document>
  )
}
