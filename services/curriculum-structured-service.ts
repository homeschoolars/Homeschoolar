import "server-only"
import { generateObject } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { openai, isOpenAIConfigured } from "@/lib/openai"

const generatedContentSchema = z.object({
  content: z.string().min(1),
})

export type CurriculumPromptKind =
  | "story"
  | "worksheet"
  | "quiz"
  | "project"
  | "debate"
  | "research"
  | "reflection"

type CurriculumContentInput = {
  storyText: string
  activityInstructions: string
  quizConcept: string
  worksheetExample: string
  parentTip: string
}

export async function getCurriculumByAgeGroup(ageGroup: string) {
  return prisma.curriculumAgeGroup.findUnique({
    where: { name: ageGroup },
    include: {
      subjects: {
        orderBy: { displayOrder: "asc" },
        include: {
          units: {
            orderBy: { displayOrder: "asc" },
            include: {
              lessons: {
                orderBy: { displayOrder: "asc" },
              },
            },
          },
        },
      },
    },
  })
}

export async function listCurriculumSubjects(ageGroup: string) {
  const age = await prisma.curriculumAgeGroup.findUnique({
    where: { name: ageGroup },
    select: { id: true },
  })
  if (!age) return null
  return prisma.curriculumSubject.findMany({
    where: { ageGroupId: age.id },
    orderBy: { displayOrder: "asc" },
    include: {
      units: {
        orderBy: { displayOrder: "asc" },
        select: { id: true, title: true, slug: true, displayOrder: true },
      },
    },
  })
}

export async function getCurriculumSubject({
  ageGroup,
  subjectId,
}: {
  ageGroup: string
  subjectId: string
}) {
  const age = await prisma.curriculumAgeGroup.findUnique({
    where: { name: ageGroup },
    select: { id: true },
  })
  if (!age) return null

  return prisma.curriculumSubject.findFirst({
    where: {
      ageGroupId: age.id,
      OR: [{ id: subjectId }, { slug: subjectId }, { baseSubjectId: subjectId }],
    },
    include: {
      units: {
        orderBy: { displayOrder: "asc" },
        include: {
          lessons: {
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  })
}

export async function getCurriculumUnit(unitId: string) {
  return prisma.curriculumUnit.findFirst({
    where: {
      OR: [{ id: unitId }, { slug: unitId }],
    },
    include: {
      lessons: {
        orderBy: { displayOrder: "asc" },
      },
      subject: {
        include: {
          ageGroup: true,
        },
      },
    },
  })
}

export async function listCurriculumUnits(subjectId: string) {
  return prisma.curriculumUnit.findMany({
    where: { subjectId },
    orderBy: { displayOrder: "asc" },
    include: {
      lessons: {
        orderBy: { displayOrder: "asc" },
        select: { id: true, title: true, slug: true, displayOrder: true },
      },
    },
  })
}

export async function getCurriculumLesson(lessonId: string) {
  return prisma.curriculumLesson.findFirst({
    where: {
      OR: [{ id: lessonId }, { slug: lessonId }],
    },
    include: {
      content: true,
      aiPrompts: true,
      unit: {
        include: {
          subject: {
            include: {
              ageGroup: true,
            },
          },
        },
      },
    },
  })
}

export async function listCurriculumLessons(unitId: string) {
  return prisma.curriculumLesson.findMany({
    where: { unitId },
    orderBy: { displayOrder: "asc" },
    include: { content: true, aiPrompts: true },
  })
}

export async function createCurriculumSubject(input: {
  ageGroup: string
  stageName?: string
  name: string
  slug: string
  displayOrder?: number
  baseSubjectId?: string | null
}) {
  const age = await prisma.curriculumAgeGroup.findUnique({
    where: { name: input.ageGroup },
    select: { id: true },
  })
  if (!age) throw new Error("Age group not found")
  return prisma.curriculumSubject.create({
    data: {
      ageGroupId: age.id,
      name: input.name,
      slug: input.slug,
      displayOrder: input.displayOrder ?? 0,
      baseSubjectId: input.baseSubjectId ?? null,
    },
  })
}

export async function updateCurriculumSubject(
  subjectId: string,
  data: Partial<{
    name: string
    slug: string
    displayOrder: number
    baseSubjectId: string | null
  }>
) {
  return prisma.curriculumSubject.update({
    where: { id: subjectId },
    data,
  })
}

export async function deleteCurriculumSubject(subjectId: string) {
  return prisma.curriculumSubject.delete({ where: { id: subjectId } })
}

export async function createCurriculumUnit(input: {
  subjectId: string
  title: string
  slug: string
  displayOrder?: number
}) {
  return prisma.curriculumUnit.create({
    data: {
      subjectId: input.subjectId,
      title: input.title,
      slug: input.slug,
      displayOrder: input.displayOrder ?? 0,
    },
  })
}

export async function updateCurriculumUnit(
  unitId: string,
  data: Partial<{ title: string; slug: string; displayOrder: number }>
) {
  return prisma.curriculumUnit.update({
    where: { id: unitId },
    data,
  })
}

export async function deleteCurriculumUnit(unitId: string) {
  return prisma.curriculumUnit.delete({ where: { id: unitId } })
}

export async function createCurriculumLesson(input: {
  unitId: string
  title: string
  slug: string
  difficultyLevel?: string
  displayOrder?: number
  content: CurriculumContentInput
}) {
  const lesson = await prisma.curriculumLesson.create({
    data: {
      unitId: input.unitId,
      title: input.title,
      slug: input.slug,
      difficultyLevel: input.difficultyLevel ?? "foundation",
      displayOrder: input.displayOrder ?? 0,
      content: {
        create: input.content,
      },
    },
    include: { content: true },
  })
  return lesson
}

export async function updateCurriculumLesson(
  lessonId: string,
  data: Partial<{
    title: string
    slug: string
    difficultyLevel: string
    displayOrder: number
    content: Partial<CurriculumContentInput>
  }>
) {
  const { content, ...lessonData } = data
  if (content) {
    await prisma.curriculumContent.upsert({
      where: { lessonId },
      update: content,
      create: {
        lessonId,
        storyText: content.storyText ?? "",
        activityInstructions: content.activityInstructions ?? "",
        quizConcept: content.quizConcept ?? "",
        worksheetExample: content.worksheetExample ?? "",
        parentTip: content.parentTip ?? "",
      },
    })
  }

  return prisma.curriculumLesson.update({
    where: { id: lessonId },
    data: lessonData,
    include: { content: true, aiPrompts: true },
  })
}

export async function deleteCurriculumLesson(lessonId: string) {
  return prisma.curriculumLesson.delete({ where: { id: lessonId } })
}

export async function updateCurriculumLessonPrompts(
  lessonId: string,
  prompts: Partial<Record<CurriculumPromptKind, string>>
) {
  const updates = (Object.entries(prompts) as Array<[CurriculumPromptKind, string | undefined]>)
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)

  for (const [type, promptTemplate] of updates) {
    await prisma.curriculumAIPrompt.upsert({
      where: { lessonId_type: { lessonId, type } },
      update: { promptTemplate: promptTemplate! },
      create: {
        lessonId,
        type,
        promptTemplate: promptTemplate!,
      },
    })
  }

  return prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    include: { content: true, aiPrompts: true },
  })
}

function getFallbackGeneratedContent(
  promptType: CurriculumPromptKind,
  lessonTitle: string,
  staticContent: {
    storyText: string
    worksheetExample: string
    quizConcept: string
  }
) {
  if (promptType === "story") {
    return staticContent.storyText
  }
  if (promptType === "worksheet") {
    return `Worksheet concept for "${lessonTitle}":\n\n${staticContent.worksheetExample}`
  }
  if (promptType === "project") {
    return `Mini project idea for "${lessonTitle}":\n\nUse this topic to create a practical task with objective, materials, steps, and expected outcome.`
  }
  if (promptType === "research") {
    return `Research task for "${lessonTitle}":\n\nResearch question, steps, sources, and presentation format.`
  }
  if (promptType === "debate") {
    return `Debate topic for "${lessonTitle}":\n\nDebate statement, arguments for/against, and critical thinking questions.`
  }
  if (promptType === "reflection") {
    return `Reflection questions for "${lessonTitle}":\n\n1) What was the most important idea you learned?\n2) How can you apply this in real life?`
  }
  return `Quiz concept for "${lessonTitle}":\n\n${staticContent.quizConcept}`
}

export async function generateLessonAsset({
  lessonId,
  type,
  sessionKey,
}: {
  lessonId: string
  type: CurriculumPromptKind
  sessionKey?: string
}) {
  const normalizedSessionKey = sessionKey?.trim() || "global"

  const existing = await prisma.curriculumGeneratedContent.findUnique({
    where: { lessonId_type_sessionKey: { lessonId, type, sessionKey: normalizedSessionKey } },
  })
  if (existing) {
    return { content: existing.content, cached: true }
  }

  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    include: {
      content: true,
      aiPrompts: {
        where: { type },
        take: 1,
      },
    },
  })

  if (!lesson || !lesson.content) {
    throw new Error("Lesson not found")
  }

  const prompt = lesson.aiPrompts[0]?.promptTemplate
  if (!prompt) {
    throw new Error("Prompt template not found for lesson")
  }

  const hydratedPrompt = prompt
    .replace(/\{\{lessonTitle\}\}/g, lesson.title)
    .replace(/\[Lesson Title\]/g, lesson.title)

  let content: string
  let model = "fallback"

  if (!isOpenAIConfigured()) {
    content = getFallbackGeneratedContent(type, lesson.title, lesson.content)
  } else {
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: generatedContentSchema,
      prompt: `${hydratedPrompt}\n\nReturn plain instructional text only.`,
    })
    content = result.object.content
    model = "gpt-4o-mini"
  }

  await prisma.curriculumGeneratedContent.upsert({
    where: { lessonId_type_sessionKey: { lessonId, type, sessionKey: normalizedSessionKey } },
    update: {
      content,
      promptSnapshot: hydratedPrompt,
      model,
      sessionKey: normalizedSessionKey,
    },
    create: {
      lessonId,
      type,
      sessionKey: normalizedSessionKey,
      content,
      promptSnapshot: hydratedPrompt,
      model,
    },
  })

  return { content, cached: false }
}
