import "server-only"
import { prisma } from "@/lib/prisma"

export async function assertParentOwnsStudent(parentUserId: string, studentId: string) {
  const child = await prisma.child.findFirst({
    where: { id: studentId, parentId: parentUserId },
    select: { id: true },
  })
  if (!child) {
    throw new Error("Forbidden")
  }
}

export async function getParentStudentPerformance(parentUserId: string, studentId: string) {
  await assertParentOwnsStudent(parentUserId, studentId)

  const [worksheets, submissions, analytics, child] = await Promise.all([
    prisma.studentWorksheet.findMany({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { worksheet: { select: { title: true } } },
    }),
    prisma.worksheetSubmission.findMany({
      where: { childId: studentId },
      orderBy: { submittedAt: "desc" },
      take: 40,
      include: {
        assignment: {
          include: { worksheet: { select: { title: true, lessonId: true } } },
        },
      },
    }),
    prisma.studentTopicAnalytics.findMany({
      where: { studentId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.child.findUnique({
      where: { id: studentId },
      select: { weakAreas: true },
    }),
  ])

  const weak_topics = [
    ...new Set([
      ...analytics.filter((a) => a.weakFlag).map((a) => a.topicId),
      ...(child?.weakAreas ?? []),
    ]),
  ]

  const worksheetSummaries = worksheets.map((w) => ({
    id: w.id,
    worksheet_id: w.worksheetId,
    topic_id: w.topicId,
    title: w.worksheet.title,
    score: w.score != null ? Number(w.score) : null,
    percentage: w.percentage != null ? Number(w.percentage) : null,
    feedback: w.feedback,
    weak_topics: (w.weakTopics as string[] | null) ?? [],
    created_at: w.createdAt.toISOString(),
  }))

  const quizSummaries = submissions.map((s) => {
    const max = s.maxScore != null ? Number(s.maxScore) : 0
    const sc = s.score != null ? Number(s.score) : 0
    const pct = max > 0 ? Math.round((sc / max) * 100) : 0
    return {
      id: s.id,
      assignment_id: s.assignmentId,
      lesson_id: s.assignment.worksheet.lessonId,
      title: s.assignment.worksheet.title,
      score: `${sc}/${max}`,
      percentage: pct,
      submitted_at: s.submittedAt.toISOString(),
    }
  })

  const topicRows = analytics.map((a) => ({
    topic_id: a.topicId,
    avg_score: Number(a.avgScore),
    attempts: a.attempts,
    last_score: a.lastScore != null ? Number(a.lastScore) : null,
    weak_flag: a.weakFlag,
  }))

  const allPercents = [
    ...worksheets.map((w) => (w.percentage != null ? Number(w.percentage) : null)).filter((x): x is number => x != null),
    ...submissions.map((s) => {
      const max = s.maxScore != null ? Number(s.maxScore) : 0
      const sc = s.score != null ? Number(s.score) : 0
      return max > 0 ? (sc / max) * 100 : null
    }).filter((x): x is number => x != null),
  ]
  const progress_summary = {
    average_percentage: allPercents.length ? Math.round(allPercents.reduce((a, b) => a + b, 0) / allPercents.length) : 0,
    total_worksheet_attempts: worksheets.length,
    total_submissions: submissions.length,
    topics_tracked: analytics.length,
  }

  return {
    worksheets: worksheetSummaries,
    quizzes: quizSummaries,
    weak_topics,
    topic_analytics: topicRows,
    progress_summary,
  }
}
