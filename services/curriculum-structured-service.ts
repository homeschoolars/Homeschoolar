import "server-only"
import { generateObject } from "ai"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { openai, isOpenAIConfigured } from "@/lib/openai"

const quizJsonSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2),
        correctAnswer: z.string().min(1),
      }),
    )
    .min(1),
})

const worksheetJsonSchema = z.object({
  title: z.string().min(1),
  activities: z.array(z.string().min(1)).min(1),
  instructions: z.string().min(1),
})

const genericContentJsonSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  points: z.array(z.string().min(1)).default([]),
})

export type CurriculumPromptKind =
  | "story"
  | "worksheet"
  | "quiz"
  | "project"
  | "debate"
  | "research"
  | "reflection"

const VALID_PROMPT_TYPES: CurriculumPromptKind[] = ["story", "worksheet", "quiz", "project", "debate", "research", "reflection"]

type CurriculumContentInput = {
  storyText: string
  activityInstructions: string
  quizConcept: string
  worksheetExample: string
  parentTip: string
}

type CurriculumImportPromptMap = Partial<Record<CurriculumPromptKind, string>>

type CurriculumImportLesson = {
  title: string
  slug?: string
  displayOrder?: number
  difficultyIndicator?: string
  content?: Partial<CurriculumContentInput>
  prompts?: CurriculumImportPromptMap
}

type CurriculumImportUnit = {
  title: string
  slug?: string
  displayOrder?: number
  lessons?: CurriculumImportLesson[]
}

type CurriculumImportSubject = {
  name: string
  slug?: string
  displayOrder?: number
  baseSubjectId?: string | null
  units?: CurriculumImportUnit[]
}

export type CurriculumImportPayload = {
  ageGroup?: string
  stageName?: string
  subjects?: CurriculumImportSubject[]
}

function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export async function importCurriculumForAgeGroup(params: {
  ageGroup: string
  stageName?: string
  payload: CurriculumImportPayload
}) {
  const ageGroupName = params.ageGroup.trim()
  if (!ageGroupName) {
    throw new Error("ageGroup is required")
  }

  const subjects = params.payload.subjects ?? []
  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new Error("Payload must include at least one subject")
  }

  const ageGroup = await prisma.curriculumAgeGroup.upsert({
    where: { name: ageGroupName },
    update: { stageName: params.stageName ?? params.payload.stageName ?? "Foundation" },
    create: {
      name: ageGroupName,
      stageName: params.stageName ?? params.payload.stageName ?? "Foundation",
    },
    select: { id: true },
  })

  let subjectCount = 0
  let unitCount = 0
  let lessonCount = 0

  for (const [subjectIndex, subject] of subjects.entries()) {
    const subjectName = subject.name?.trim()
    if (!subjectName) continue
    const subjectSlug = (subject.slug?.trim() || slugifyValue(subjectName)) || `subject-${subjectIndex + 1}`

    const createdSubject = await prisma.curriculumSubject.upsert({
      where: {
        ageGroupId_slug: {
          ageGroupId: ageGroup.id,
          slug: subjectSlug,
        },
      },
      update: {
        name: subjectName,
        displayOrder: subject.displayOrder ?? subjectIndex + 1,
        baseSubjectId: subject.baseSubjectId ?? null,
      },
      create: {
        ageGroupId: ageGroup.id,
        name: subjectName,
        slug: subjectSlug,
        displayOrder: subject.displayOrder ?? subjectIndex + 1,
        baseSubjectId: subject.baseSubjectId ?? null,
      },
      select: { id: true },
    })
    subjectCount += 1

    const units = subject.units ?? []
    for (const [unitIndex, unit] of units.entries()) {
      const unitTitle = unit.title?.trim()
      if (!unitTitle) continue
      const unitSlug = (unit.slug?.trim() || slugifyValue(unitTitle)) || `unit-${unitIndex + 1}`

      const createdUnit = await prisma.curriculumUnit.upsert({
        where: {
          subjectId_slug: {
            subjectId: createdSubject.id,
            slug: unitSlug,
          },
        },
        update: {
          title: unitTitle,
          displayOrder: unit.displayOrder ?? unitIndex + 1,
        },
        create: {
          subjectId: createdSubject.id,
          title: unitTitle,
          slug: unitSlug,
          displayOrder: unit.displayOrder ?? unitIndex + 1,
        },
        select: { id: true },
      })
      unitCount += 1

      const lessons = unit.lessons ?? []
      for (const [lessonIndex, lesson] of lessons.entries()) {
        const lessonTitle = lesson.title?.trim()
        if (!lessonTitle) continue
        const lessonSlug = (lesson.slug?.trim() || slugifyValue(lessonTitle)) || `lesson-${lessonIndex + 1}`

        const createdLesson = await prisma.curriculumLesson.upsert({
          where: {
            unitId_slug: {
              unitId: createdUnit.id,
              slug: lessonSlug,
            },
          },
          update: {
            title: lessonTitle,
            displayOrder: lesson.displayOrder ?? lessonIndex + 1,
            difficultyLevel: lesson.difficultyIndicator ?? "foundation",
          },
          create: {
            unitId: createdUnit.id,
            title: lessonTitle,
            slug: lessonSlug,
            displayOrder: lesson.displayOrder ?? lessonIndex + 1,
            difficultyLevel: lesson.difficultyIndicator ?? "foundation",
          },
          select: { id: true, title: true },
        })
        lessonCount += 1

        await prisma.curriculumContent.upsert({
          where: { lessonId: createdLesson.id },
          update: {
            storyText: lesson.content?.storyText ?? "",
            activityInstructions: lesson.content?.activityInstructions ?? "",
            quizConcept: lesson.content?.quizConcept ?? "",
            worksheetExample: lesson.content?.worksheetExample ?? "",
            parentTip: lesson.content?.parentTip ?? "",
          },
          create: {
            lessonId: createdLesson.id,
            storyText: lesson.content?.storyText ?? "",
            activityInstructions: lesson.content?.activityInstructions ?? "",
            quizConcept: lesson.content?.quizConcept ?? "",
            worksheetExample: lesson.content?.worksheetExample ?? "",
            parentTip: lesson.content?.parentTip ?? "",
          },
        })

        const promptEntries = Object.entries(lesson.prompts ?? {}) as Array<[string, string | undefined]>
        for (const [type, template] of promptEntries) {
          if (!VALID_PROMPT_TYPES.includes(type as CurriculumPromptKind)) continue
          const promptTemplate = template?.trim()
          if (!promptTemplate) continue
          await prisma.curriculumAIPrompt.upsert({
            where: { lessonId_type: { lessonId: createdLesson.id, type: type as CurriculumPromptKind } },
            update: { promptTemplate },
            create: { lessonId: createdLesson.id, type: type as CurriculumPromptKind, promptTemplate },
          })
        }
      }
    }
  }

  return { subjects: subjectCount, units: unitCount, lessons: lessonCount }
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

  const directMatch = await prisma.curriculumSubject.findFirst({
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

  if (directMatch) return directMatch

  // Fallback: when route carries canonical Subject table id but curriculum rows were imported
  // without baseSubjectId linkage, resolve by normalized subject name/slug.
  const baseSubject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { name: true },
  })
  if (!baseSubject?.name) return null

  const baseSlug = slugifyValue(baseSubject.name)
  return prisma.curriculumSubject.findFirst({
    where: {
      ageGroupId: age.id,
      OR: [{ slug: baseSlug }, { name: { equals: baseSubject.name, mode: "insensitive" } }],
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
  category?: "CORE" | "FUTURE" | "CREATIVE" | "LIFE"
  orderIndex?: number
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
      category: input.category ?? "CORE",
      orderIndex: input.orderIndex ?? input.displayOrder ?? 0,
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
    category: "CORE" | "FUTURE" | "CREATIVE" | "LIFE"
    orderIndex: number
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
  orderIndex?: number
  displayOrder?: number
}) {
  return prisma.curriculumUnit.create({
    data: {
      subjectId: input.subjectId,
      title: input.title,
      slug: input.slug,
      orderIndex: input.orderIndex ?? input.displayOrder ?? 0,
      displayOrder: input.displayOrder ?? 0,
    },
  })
}

export async function updateCurriculumUnit(
  unitId: string,
  data: Partial<{ title: string; slug: string; orderIndex: number; displayOrder: number }>
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
  orderIndex?: number
  displayOrder?: number
  content: CurriculumContentInput
}) {
  const lesson = await prisma.curriculumLesson.create({
    data: {
      unitId: input.unitId,
      title: input.title,
      slug: input.slug,
      difficultyLevel: input.difficultyLevel ?? "foundation",
      orderIndex: input.orderIndex ?? input.displayOrder ?? 0,
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
    orderIndex: number
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

function getSchemaForType(type: CurriculumPromptKind) {
  if (type === "quiz") return quizJsonSchema
  if (type === "worksheet") return worksheetJsonSchema
  return genericContentJsonSchema
}

function fallbackStructuredJson(
  type: CurriculumPromptKind,
  lessonTitle: string,
  staticContent: {
    storyText: string
    worksheetExample: string
    quizConcept: string
    activityInstructions: string
    parentTip: string
  },
) {
  if (type === "quiz") {
    return {
      questions: [
        {
          question: `What is one key idea from "${lessonTitle}"?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option A",
        },
      ],
    }
  }
  if (type === "worksheet") {
    return {
      title: `${lessonTitle} Worksheet`,
      instructions: staticContent.activityInstructions || `Complete the worksheet for ${lessonTitle}.`,
      activities: [staticContent.worksheetExample || `Practice activity for ${lessonTitle}`],
    }
  }
  return {
    title: `${lessonTitle} ${type}`,
    content: getFallbackGeneratedContent(type, lessonTitle, staticContent),
    points: [staticContent.parentTip || "Review and discuss with your parent/teacher."],
  }
}

function stringifyContentJson(type: CurriculumPromptKind, contentJson: unknown) {
  if (type === "quiz") {
    const parsed = quizJsonSchema.safeParse(contentJson)
    if (!parsed.success) return JSON.stringify(contentJson, null, 2)
    return parsed.data.questions
      .map(
        (q, index) =>
          `Q${index + 1}. ${q.question}\n${q.options.map((option, optionIndex) => `  ${String.fromCharCode(65 + optionIndex)}. ${option}`).join("\n")}\nAnswer: ${q.correctAnswer}`,
      )
      .join("\n\n")
  }
  return JSON.stringify(contentJson, null, 2)
}

export async function generateStructuredLessonAsset({
  lessonId,
  contentType,
  forceRegenerate = false,
}: {
  lessonId: string
  contentType: CurriculumPromptKind
  forceRegenerate?: boolean
}) {
  const existing = await prisma.curriculumGeneratedContent.findFirst({
    where: { lessonId, type: contentType },
    select: { id: true, content: true, contentJson: true, createdAt: true, updatedAt: true },
  })
  if (existing && !forceRegenerate) {
    return { cached: true, content: existing.content, contentJson: existing.contentJson }
  }

  const lesson = await prisma.curriculumLesson.findUnique({
    where: { id: lessonId },
    include: {
      content: true,
      aiPrompts: {
        where: { type: contentType },
        take: 1,
      },
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

  if (!lesson || !lesson.content) {
    throw new Error("Lesson not found")
  }

  const promptTemplate = lesson.aiPrompts[0]?.promptTemplate
  if (!promptTemplate) {
    throw new Error("Prompt template not found for lesson")
  }

  const hydratedPrompt = promptTemplate
    .replace(/\{\{lessonTitle\}\}/g, lesson.title)
    .replace(/\[Lesson Title\]/g, lesson.title)
    .replace(/\{\{age\}\}/g, lesson.unit.subject.ageGroup.name)
    .replace(/\{\{subject\}\}/g, lesson.unit.subject.name)
    .replace(/\{\{topic\}\}/g, lesson.unit.title)
    .replace(/\{\{lesson\}\}/g, lesson.title)

  const schema = getSchemaForType(contentType)
  let contentJson: unknown
  let model = "fallback"

  if (!isOpenAIConfigured()) {
    contentJson = fallbackStructuredJson(contentType, lesson.title, {
      storyText: lesson.content.storyText,
      worksheetExample: lesson.content.worksheetExample,
      quizConcept: lesson.content.quizConcept,
      activityInstructions: lesson.content.activityInstructions,
      parentTip: lesson.content.parentTip,
    })
  } else {
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema,
      prompt: `${hydratedPrompt}

Return strict JSON only. Do not include markdown or extra text.`,
    })
    contentJson = result.object
    model = "gpt-4o-mini"
  }

  const content = stringifyContentJson(contentType, contentJson)

  await prisma.curriculumGeneratedContent.upsert({
    where: { lessonId_type_sessionKey: { lessonId, type: contentType, sessionKey: "global" } },
    update: {
      content,
      contentJson: contentJson as object,
      promptSnapshot: hydratedPrompt,
      model,
      sessionKey: "global",
    },
    create: {
      lessonId,
      type: contentType,
      sessionKey: "global",
      content,
      contentJson: contentJson as object,
      promptSnapshot: hydratedPrompt,
      model,
    },
  })

  return { cached: false, content, contentJson }
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
  void sessionKey // kept for backward compatibility
  const generated = await generateStructuredLessonAsset({
    lessonId,
    contentType: type,
    forceRegenerate: false,
  })
  return { content: generated.content, cached: generated.cached }
}
