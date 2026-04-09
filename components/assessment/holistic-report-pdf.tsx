import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { AssessmentReportPublic } from "@/lib/assessment/types-ai"

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  h1: { fontSize: 20, marginBottom: 12, color: "#4c1d95" },
  h2: { fontSize: 14, marginTop: 14, marginBottom: 6, color: "#5b21b6" },
  p: { marginBottom: 6, lineHeight: 1.5, color: "#1e293b" },
  small: { fontSize: 9, color: "#64748b", marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  box: { padding: 10, backgroundColor: "#f5f3ff", borderRadius: 4, marginBottom: 8 },
})

export function HolisticReportPdfDocument({
  childName,
  age,
  report,
}: {
  childName: string
  age: number
  report: AssessmentReportPublic
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>HomeSchoolar — Learning assessment</Text>
        <Text style={styles.p}>
          {childName}, age {age}
        </Text>
        <View style={styles.box}>
          <Text style={styles.p}>Learner type: {report.learningProfile.learnerType}</Text>
          <Text style={styles.p}>Interests: {report.interestProfile.primary} · {report.interestProfile.secondary}</Text>
        </View>
        <Text style={styles.h2}>Thinking & reasoning (informal)</Text>
        <Text style={styles.p}>
          {report.iqEstimate.score} — {report.iqEstimate.category}
        </Text>
        <Text style={styles.p}>{report.iqEstimate.explanation}</Text>
        <Text style={styles.h2}>Social & emotional</Text>
        <Text style={styles.p}>
          {report.eqEstimate.score} — {report.eqEstimate.category}
        </Text>
        <Text style={styles.p}>{report.eqEstimate.explanation}</Text>
        <Text style={styles.h2}>Wellbeing & engagement</Text>
        <Text style={styles.p}>{report.mentalHealthSnapshot.overall}</Text>
        <Text style={styles.p}>{report.mentalHealthSnapshot.note}</Text>
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Subject observations</Text>
        {report.subjectScores.map((s) => (
          <View key={s.subject} style={{ marginBottom: 8 }}>
            <Text style={styles.p}>
              {s.label || s.subject}: {s.score}/100 ({s.level}) — {s.observation}
            </Text>
          </View>
        ))}
        <Text style={styles.h2}>Strong subjects</Text>
        {report.strongSubjects.map((s) => (
          <Text key={s} style={styles.p}>
            • {s}
          </Text>
        ))}
        <Text style={styles.h2}>Growth opportunities</Text>
        {report.weakSubjects.map((s) => (
          <Text key={s} style={styles.p}>
            • {s}
          </Text>
        ))}
      </Page>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Learning style & pace</Text>
        <Text style={styles.p}>Style: {report.learningProfile.preferredStyle}</Text>
        <Text style={styles.p}>Pace: {report.learningProfile.paceType}</Text>
        <Text style={styles.p}>{report.learningProfile.narrative}</Text>
        <Text style={styles.h2}>Recommendations</Text>
        {report.recommendations.map((r, i) => (
          <View key={i} style={{ marginBottom: 10 }}>
            <Text style={styles.p}>
              {r.icon} {r.title}
            </Text>
            <Text style={styles.p}>{r.detail}</Text>
            <Text style={styles.small}>{r.linkedSubject}</Text>
          </View>
        ))}
        <Text style={styles.h2}>A note for you</Text>
        <Text style={styles.p}>{report.parentMessage}</Text>
        <Text style={styles.p}>{report.overallSummary}</Text>
      </Page>
    </Document>
  )
}
