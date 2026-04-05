import type { ReactNode } from "react"
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer"
import type { AdaptiveQuizOutput, AdaptiveWorksheetOutput } from "@/services/adaptive-ai-validation"

Font.register({
  family: "Nunito",
  fonts: [
    { src: "https://fonts.gstatic.com/s/nunito/v25/XRXV3I6Li01BKofINeaBTMnFcQ.woff2", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/nunito/v25/XRXW3I6Li01BKofA6sOpNeaB.woff2", fontWeight: 700 },
  ],
})

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: "Nunito", fontSize: 11, color: "#1f2937" },
  brandHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#c4b5fd",
    alignItems: "center",
  },
  brandLogo: { width: 72, height: 24, marginBottom: 6, objectFit: "contain" },
  brandName: { fontSize: 18, fontWeight: 700, color: "#5b21b6" },
  brandTagline: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  metaBox: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#f5f3ff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metaLabel: { fontSize: 9, color: "#6b7280" },
  metaValue: { fontSize: 9, fontWeight: 700, color: "#111827", maxWidth: "65%" },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#5b21b6", marginBottom: 10, marginTop: 4 },
  questionBlock: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#fafafa",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#8b5cf6",
  },
  qNum: { fontSize: 9, fontWeight: 700, color: "#7c3aed", marginBottom: 4 },
  qText: { fontSize: 10, lineHeight: 1.45, marginBottom: 6 },
  option: { fontSize: 9, marginLeft: 8, marginBottom: 2 },
  answerLine: {
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#9ca3af",
    borderStyle: "dashed",
    minHeight: 22,
  },
  storyParagraph: { fontSize: 13, lineHeight: 1.65, marginBottom: 12, color: "#374151" },
  storyTitle: { fontSize: 20, fontWeight: 700, color: "#5b21b6", marginBottom: 16, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
  keyBlock: { marginBottom: 8, padding: 8, backgroundColor: "#ecfdf5", borderRadius: 4 },
  keyText: { fontSize: 9, color: "#065f46" },
})

export type PdfBrandingProps = {
  appName: string
  tagline: string
  logoAbsoluteUrl?: string | null
}

function BrandHeader({ branding }: { branding: PdfBrandingProps }) {
  return (
    <View style={styles.brandHeader}>
      {branding.logoAbsoluteUrl ? (
        <Image src={branding.logoAbsoluteUrl} style={styles.brandLogo} />
      ) : null}
      <Text style={styles.brandName}>{branding.appName}</Text>
      <Text style={styles.brandTagline}>{branding.tagline}</Text>
    </View>
  )
}

type MetaPageProps = {
  branding: PdfBrandingProps
  studentName: string
  subject: string
  lessonTitle: string
  contentLabel: string
  children: ReactNode
}

function MetaPage({ branding, studentName, subject, lessonTitle, contentLabel, children }: MetaPageProps) {
  const date = new Date().toLocaleDateString()
  return (
    <Page size="A4" style={styles.page}>
      <BrandHeader branding={branding} />
      <View style={styles.metaBox}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Student</Text>
          <Text style={styles.metaValue}>{studentName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Subject</Text>
          <Text style={styles.metaValue}>{subject}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Lesson</Text>
          <Text style={styles.metaValue}>{lessonTitle}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Document</Text>
          <Text style={styles.metaValue}>{contentLabel}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Date</Text>
          <Text style={styles.metaValue}>{date}</Text>
        </View>
      </View>
      {children}
      <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} fixed />
    </Page>
  )
}

export function AdaptiveWorksheetPDFDocument(props: {
  branding: PdfBrandingProps
  studentName: string
  subject: string
  lessonTitle: string
  worksheet: AdaptiveWorksheetOutput
}) {
  const { branding, studentName, subject, lessonTitle, worksheet } = props
  let actIndex = 0
  return (
    <Document>
      <MetaPage branding={branding} studentName={studentName} subject={subject} lessonTitle={lessonTitle} contentLabel="Worksheet">
        <Text style={styles.sectionTitle}>{worksheet.title}</Text>
        <Text style={{ fontSize: 10, marginBottom: 14, lineHeight: 1.5 }}>{worksheet.instructions}</Text>
        {worksheet.activities.map((a) => {
          actIndex += 1
          const idx = actIndex
          return (
            <View key={idx} style={styles.questionBlock} wrap={false}>
              <Text style={styles.qNum}>Activity {idx}</Text>
              {a.type === "mcq" ? (
                <>
                  <Text style={styles.qText}>{a.question}</Text>
                  {a.options.map((opt, i) => (
                    <Text key={i} style={styles.option}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </Text>
                  ))}
                </>
              ) : null}
              {a.type === "short_answer" ? (
                <>
                  <Text style={styles.qText}>{a.question}</Text>
                  <View style={styles.answerLine} />
                  <View style={styles.answerLine} />
                </>
              ) : null}
              {a.type === "fill_in_blank" ? (
                <>
                  <Text style={styles.qText}>{a.prompt.replace(/_{3,}/g, " __________ ")}</Text>
                  <Text style={{ fontSize: 8, color: "#6b7280", marginTop: 4 }}>Fill each blank on paper.</Text>
                </>
              ) : null}
              {a.type === "match" ? (
                <>
                  <Text style={{ fontSize: 10, marginBottom: 6 }}>Draw lines to match each item in the left column to the correct item on the right.</Text>
                  <View style={{ flexDirection: "row" }}>
                    <View style={{ flex: 1, paddingRight: 16 }}>
                      {a.leftColumn.map((l, i) => (
                        <Text key={i} style={{ marginBottom: 6, fontSize: 10 }}>
                          {i + 1}. {l}
                        </Text>
                      ))}
                    </View>
                    <View style={{ flex: 1, paddingLeft: 16 }}>
                      {a.rightColumn.map((r, i) => (
                        <Text key={i} style={{ marginBottom: 6, fontSize: 10 }}>
                          {String.fromCharCode(65 + i)}. {r}
                        </Text>
                      ))}
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          )
        })}
      </MetaPage>
    </Document>
  )
}

export function AdaptiveQuizPDFDocument(props: {
  branding: PdfBrandingProps
  studentName: string
  subject: string
  lessonTitle: string
  quiz: AdaptiveQuizOutput
  includeAnswerKey: boolean
}) {
  const { branding, studentName, subject, lessonTitle, quiz, includeAnswerKey } = props
  return (
    <Document>
      <MetaPage branding={branding} studentName={studentName} subject={subject} lessonTitle={lessonTitle} contentLabel="Quiz">
        <Text style={styles.sectionTitle}>Quiz questions</Text>
        {quiz.questions.map((q, i) => (
          <View key={i} style={styles.questionBlock} wrap={false}>
            <Text style={styles.qNum}>
              Question {i + 1} of {quiz.questions.length}
            </Text>
            <Text style={styles.qText}>{q.question}</Text>
            {q.options.map((opt, j) => (
              <Text key={j} style={styles.option}>
                {String.fromCharCode(65 + j)}. {opt}
              </Text>
            ))}
            <View style={styles.answerLine} />
          </View>
        ))}
      </MetaPage>
      {includeAnswerKey ? (
        <MetaPage branding={branding} studentName={studentName} subject={subject} lessonTitle={lessonTitle} contentLabel="Answer key">
          <Text style={styles.sectionTitle}>Answer key</Text>
          {quiz.questions.map((q, i) => (
            <View key={i} style={styles.keyBlock} wrap={false}>
              <Text style={styles.keyText}>
                Q{i + 1}: {q.correctAnswer}
              </Text>
              <Text style={{ fontSize: 8, color: "#047857", marginTop: 4 }}>{q.explanation ?? ""}</Text>
            </View>
          ))}
        </MetaPage>
      ) : null}
    </Document>
  )
}

export function AdaptiveStoryPDFDocument(props: {
  branding: PdfBrandingProps
  studentName: string
  subject: string
  lessonTitle: string
  story: string
}) {
  const { branding, studentName, subject, lessonTitle, story } = props
  const paragraphs = story.split(/\n+/).map((p) => p.trim()).filter(Boolean)
  return (
    <Document>
      <MetaPage branding={branding} studentName={studentName} subject={subject} lessonTitle={lessonTitle} contentLabel="Story">
        <Text style={styles.storyTitle}>Lesson story</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={styles.storyParagraph}>
            {p}
          </Text>
        ))}
      </MetaPage>
    </Document>
  )
}
