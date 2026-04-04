import "server-only"
import { generateObject } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import { generateStructuredLessonAsset } from "@/services/curriculum-structured-service"

type ParentContentType = "quiz" | "worksheet"

const generatedExamSchema = z.object({
  mcqs: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2),
        correctAnswer: z.string().min(1),
      }),
    )
    .min(5),
  shortQuestions: z
    .array(
      z.object({
        question: z.string().min(1),
        sampleAnswer: z.string().min(1),
      }),
    )
    .min(3),
})

export async function isUnitCompletedByStudent({
  studentId,
  unitId,
}: {
  studentId: string
  unitId: string
}) {
  const lessons = await prisma.curriculumLesson.findMany({
    where: { unitId },
    select: { id: true },
  })
  if (lessons.length === 0) return false

  const completedCount = await prisma.studentLessonProgress.count({
    where: {
      studentId,
      lessonId: { in: lessons.map((l) => l.id) },
      status: "completed",
    },
  })
  return completedCount === lessons.length
}

export async function generateParentControlledContent({
  studentId,
  subjectId,
  unitId,
  contentType,
  forceRegenerate = false,
}: {
  studentId: string
  subjectId: string
  unitId: string
  contentType: ParentContentType
  forceRegenerate?: boolean
}) {
  const unit = await prisma.curriculumUnit.findUnique({
    where: { id: unitId },
    include: {
      subject: true,
      lessons: {
        orderBy: [{ orderIndex: "asc" }, { displayOrder: "asc" }],
        select: { id: true, title: true },
      },
    },
  })
  if (!unit) throw new Error("Unit not found")
  if (unit.subject.baseSubjectId !== subjectId && unit.subjectId !== subjectId) {
    throw new Error("Forbidden")
  }
  if (unit.lessons.length === 0) {
    throw new Error("Unit has no lessons")
  }

  const completed = await isUnitCompletedByStudent({ studentId, unitId })
  if (!completed) {
    throw new Error("UnitNotCompleted")
  }

  const existing = await prisma.curriculumGeneratedContent.findFirst({
    where: {
      studentId,
      unitId,
      type: contentType,
      visibility: "shared",
    },
    orderBy: { createdAt: "desc" },
  })
  if (existing && !forceRegenerate) {
    return { cached: true, content: existing.content, contentJson: existing.contentJson }
  }

  // Build unit-level content by combining lesson-level generated outputs.
  const lessonOutputs = await Promise.all(
    unit.lessons.map((lesson) =>
      generateStructuredLessonAsset({
        lessonId: lesson.id,
        contentType,
        forceRegenerate: false,
      }),
    ),
  )

  const mergedJson =
    contentType === "quiz"
      ? {
          questions: lessonOutputs.flatMap((out) => {
            const json = out.contentJson as { questions?: unknown[] } | null
            return Array.isArray(json?.questions) ? json.questions : []
          }),
        }
      : {
          title: `${unit.title} Worksheet`,
          activities: lessonOutputs.map((out) => out.content).filter(Boolean),
          instructions: `Complete all activities for ${unit.title}.`,
        }

  const content = JSON.stringify(mergedJson, null, 2)
  const normalizedContentJson = JSON.parse(content)

  const generated = await prisma.curriculumGeneratedContent.create({
    data: {
      lessonId: unit.lessons[0].id,
      studentId,
      unitId,
      type: contentType,
      sessionKey: "global",
      visibility: "shared",
      generatedBy: "parent",
      content,
      contentJson: normalizedContentJson,
      promptSnapshot: `Parent generated ${contentType} for unit ${unit.title}`,
      model: "gpt-4o-mini",
    },
  })

  return { cached: false, content: generated.content, contentJson: generated.contentJson }
}

export async function listSharedGeneratedContentForStudent(studentId: string) {
  const rows = await prisma.curriculumGeneratedContent.findMany({
    where: {
      studentId,
      visibility: "shared",
      type: { in: ["quiz", "worksheet"] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      unit: {
        include: {
          subject: true,
        },
      },
    },
  })

  return rows
}

export async function isSubjectFullyCompletedForStudent({
  studentId,
  subjectId,
}: {
  studentId: string
  subjectId: string
}) {
  const curriculumSubjects = await prisma.curriculumSubject.findMany({
    where: {
      OR: [{ id: subjectId }, { baseSubjectId: subjectId }],
    },
    select: {
      id: true,
      units: {
        select: {
          id: true,
          lessons: {
            select: { id: true },
          },
        },
      },
    },
  })

  const lessonIds = curriculumSubjects.flatMap((subject) => subject.units.flatMap((unit) => unit.lessons.map((l) => l.id)))
  if (lessonIds.length === 0) return false

  const completedCount = await prisma.studentLessonProgress.count({
    where: {
      studentId,
      lessonId: { in: lessonIds },
      status: "completed",
    },
  })

  return completedCount === lessonIds.length
}

export async function getUnitCompletionForStudent({
  studentId,
  subjectId,
}: {
  studentId: string
  subjectId: string
}) {
  const curriculumSubjects = await prisma.curriculumSubject.findMany({
    where: { OR: [{ id: subjectId }, { baseSubjectId: subjectId }] },
    include: {
      units: {
        orderBy: [{ orderIndex: "asc" }, { displayOrder: "asc" }],
        include: {
          lessons: {
            orderBy: [{ orderIndex: "asc" }, { displayOrder: "asc" }],
            select: { id: true },
          },
        },
      },
    },
  })

  const units = curriculumSubjects.flatMap((subject) => subject.units)
  const allLessonIds = units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id))
  if (allLessonIds.length === 0) return []

  const progressRows = await prisma.studentLessonProgress.findMany({
    where: {
      studentId,
      lessonId: { in: allLessonIds },
    },
    select: { lessonId: true, status: true },
  })
  const completedLessonSet = new Set(progressRows.filter((row) => row.status === "completed").map((row) => row.lessonId))

  return units.map((unit) => {
    const totalLessons = unit.lessons.length
    const completedLessons = unit.lessons.filter((lesson) => completedLessonSet.has(lesson.id)).length
    return {
      unitId: unit.id,
      title: unit.title,
      totalLessons,
      completedLessons,
      isCompleted: totalLessons > 0 && completedLessons === totalLessons,
    }
  })
}

export async function generateSubjectExam({
  studentId,
  subjectId,
  forceRegenerate = false,
}: {
  studentId: string
  subjectId: string
  forceRegenerate?: boolean
}) {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, name: true },
  })
  if (!subject) throw new Error("Subject not found")

  const completed = await isSubjectFullyCompletedForStudent({ studentId, subjectId })
  if (!completed) throw new Error("SubjectNotCompleted")

  const existing = await prisma.subjectExam.findFirst({
    where: { studentId, subjectId, completedAt: null },
    orderBy: { createdAt: "desc" },
  })
  if (existing && !forceRegenerate) {
    return { cached: true, exam: existing }
  }

  const curriculumSubjects = await prisma.curriculumSubject.findMany({
    where: { OR: [{ id: subjectId }, { baseSubjectId: subjectId }] },
    include: {
      ageGroup: true,
      units: {
        orderBy: [{ orderIndex: "asc" }, { displayOrder: "asc" }],
        include: {
          lessons: {
            orderBy: [{ orderIndex: "asc" }, { displayOrder: "asc" }],
            include: { content: true },
          },
        },
      },
    },
  })

  const unitSummaries = curriculumSubjects.flatMap((s) =>
    s.units.map((u) => ({
      unit: u.title,
      lessons: u.lessons.map((l) => ({ title: l.title, concept: l.content?.quizConcept ?? l.content?.storyText ?? "" })),
    })),
  )

  let examJson: z.infer<typeof generatedExamSchema>
  if (!isOpenAIConfigured()) {
    examJson = {
      mcqs: [
        {
          question: `What is a key concept in ${subject.name}?`,
          options: ["Concept A", "Concept B", "Concept C", "Concept D"],
          correctAnswer: "Concept A",
        },
      ],
      shortQuestions: [
        {
          question: `Explain one important idea from ${subject.name}.`,
          sampleAnswer: "A correct response should explain the concept with a simple example.",
        },
      ],
    }
  } else {
    const age = curriculumSubjects[0]?.ageGroup?.name ?? "8-9"
    const generated = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: generatedExamSchema,
      prompt: `Generate a final subject exam in strict JSON.
Subject: ${subject.name}
Age Group: ${age}
Units and lessons context:
${JSON.stringify(unitSummaries, null, 2)}

Requirements:
- Cover all units conceptually
- Mix easy/medium/hard questions
- Age appropriate language
- Return JSON only`,
    })
    examJson = generated.object
  }

  const exam = await prisma.subjectExam.create({
    data: {
      studentId,
      subjectId,
      examJson: JSON.parse(JSON.stringify(examJson)),
    },
  })
  return { cached: false, exam }
}

export async function submitSubjectExam({
  examId,
  answers,
}: {
  examId: string
  answers: {
    mcqs?: Array<{ index: number; answer: string }>
    shortQuestions?: Array<{ index: number; answer: string }>
  }
}) {
  const exam = await prisma.subjectExam.findUnique({
    where: { id: examId },
  })
  if (!exam) throw new Error("Exam not found")

  const examJson = exam.examJson as {
    mcqs?: Array<{ correctAnswer: string }>
    shortQuestions?: Array<{ sampleAnswer: string }>
  }
  const mcqs = Array.isArray(examJson.mcqs) ? examJson.mcqs : []
  const shortQuestions = Array.isArray(examJson.shortQuestions) ? examJson.shortQuestions : []
  const submittedMcqs = Array.isArray(answers.mcqs) ? answers.mcqs : []
  const submittedShort = Array.isArray(answers.shortQuestions) ? answers.shortQuestions : []

  let score = 0
  let maxScore = 0

  for (let i = 0; i < mcqs.length; i += 1) {
    maxScore += 1
    const submitted = submittedMcqs.find((a) => a.index === i)
    if (submitted && submitted.answer.trim().toLowerCase() === String(mcqs[i].correctAnswer).trim().toLowerCase()) {
      score += 1
    }
  }

  for (let i = 0; i < shortQuestions.length; i += 1) {
    maxScore += 1
    const submitted = submittedShort.find((a) => a.index === i)
    if (submitted?.answer?.trim()) {
      // Give credit for completed short response; strict NLP grading is out-of-scope for this iteration.
      score += 1
    }
  }

  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0

  const updated = await prisma.subjectExam.update({
    where: { id: examId },
    data: {
      score: percentage,
      completedAt: new Date(),
    },
  })

  return { exam: updated, score, maxScore, percentage }
}

export async function getLatestSubjectExam({
  studentId,
  subjectId,
}: {
  studentId: string
  subjectId: string
}) {
  return prisma.subjectExam.findFirst({
    where: { studentId, subjectId },
    orderBy: { createdAt: "desc" },
  })
}
