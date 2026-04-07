import "server-only"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

const WEAK_THRESHOLD = 60

/**
 * Rolling average of percentage scores per topic (lesson). `weak_flag` when avg &lt; 60%.
 */
export async function recordTopicAttemptPercent(params: {
  studentId: string
  topicId: string | null | undefined
  percentage: number
}): Promise<void> {
  const { studentId, topicId, percentage } = params
  if (!topicId) return

  const existing = await prisma.studentTopicAnalytics.findUnique({
    where: { studentId_topicId: { studentId, topicId } },
  })

  const attempts = (existing?.attempts ?? 0) + 1
  const prevAvg = existing ? Number(existing.avgScore) : 0
  const prevN = existing?.attempts ?? 0
  const newAvg = prevN === 0 ? percentage : (prevAvg * prevN + percentage) / attempts
  const weakFlag = newAvg < WEAK_THRESHOLD

  await prisma.studentTopicAnalytics.upsert({
    where: { studentId_topicId: { studentId, topicId } },
    create: {
      studentId,
      topicId,
      avgScore: new Prisma.Decimal(Math.round(newAvg * 100) / 100),
      attempts,
      lastScore: new Prisma.Decimal(Math.round(percentage * 100) / 100),
      weakFlag,
    },
    update: {
      avgScore: new Prisma.Decimal(Math.round(newAvg * 100) / 100),
      attempts,
      lastScore: new Prisma.Decimal(Math.round(percentage * 100) / 100),
      weakFlag,
    },
  })
}

export async function createStudentWorksheetRecord(params: {
  studentId: string
  worksheetId: string
  assignmentId?: string | null
  subjectId?: string | null
  topicId?: string | null
  answersJson: unknown
  score: number
  maxScore: number
  percentage: number
  feedback: string | null
  weakTopics: string[]
}) {
  return prisma.studentWorksheet.create({
    data: {
      studentId: params.studentId,
      worksheetId: params.worksheetId,
      assignmentId: params.assignmentId ?? null,
      subjectId: params.subjectId ?? null,
      topicId: params.topicId ?? null,
      answersJson: params.answersJson as Prisma.InputJsonValue,
      score: new Prisma.Decimal(params.score),
      percentage: new Prisma.Decimal(Math.round(params.percentage * 100) / 100),
      feedback: params.feedback,
      weakTopics: params.weakTopics,
    },
  })
}
