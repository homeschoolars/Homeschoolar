import type { CurriculumImportPayload } from "@/services/curriculum-structured-service"

type CurriculumPromptKind = "story" | "worksheet" | "quiz" | "project" | "debate" | "research" | "reflection"

type HtmlSubject = {
  name: string
  cat: "core" | "future" | "creative" | "life"
  color: string
  content: Record<number, string[]>
}

type HtmlCurriculum = Record<string, HtmlSubject>

const AGE_RANGES: Array<{ name: string; years: [number, number]; stageName: string }> = [
  { name: "4-5", years: [4, 5], stageName: "Little Explorers 🌱" },
  { name: "5-6", years: [5, 6], stageName: "Mini Adventurers 🐾" },
  { name: "6-7", years: [6, 7], stageName: "Curious Minds 🔍" },
  { name: "7-8", years: [7, 8], stageName: "Young Investigators 🧩" },
  { name: "8-9", years: [8, 9], stageName: "Growing Learners 💡" },
  { name: "9-10", years: [9, 10], stageName: "Knowledge Explorers 🚀" },
  { name: "10-11", years: [10, 11], stageName: "Knowledge Builders 🏗️" },
  { name: "11-12", years: [11, 12], stageName: "Skill Sharpeners ⚡" },
  { name: "12-13", years: [12, 13], stageName: "Future Leaders 🌟" },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function getDifficultyIndicator(ageStart: number) {
  if (ageStart <= 6) return "recognition"
  if (ageStart <= 9) return "understanding"
  if (ageStart <= 11) return "application"
  return "analysis"
}

function buildPromptTemplates(ageStart: number): Partial<Record<CurriculumPromptKind, string>> {
  const base: Partial<Record<CurriculumPromptKind, string>> = {
    story:
      "Act as an expert educator. Create an age-appropriate story for {{lessonTitle}} with a clear beginning, middle, end, and a practical moral lesson.",
    worksheet:
      "Act as a teacher. Create a printable worksheet for {{lessonTitle}} with mixed question styles, clear instructions, and age-appropriate challenge.",
    quiz: "Act as a teacher. Create a concise quiz for {{lessonTitle}} with concept-checking and reasoning-based questions.",
  }
  if (ageStart >= 8) {
    base.project =
      "Create a mini project for {{lessonTitle}} with objective, materials, step-by-step instructions, and expected outcome."
  }
  if (ageStart >= 10) {
    base.research =
      "Create a guided research task for {{lessonTitle}} with research question, steps, sources, and presentation format."
    base.reflection = "Generate 3 reflection questions for {{lessonTitle}} that promote critical thinking."
  }
  if (ageStart >= 11) {
    base.debate = "Create a debate prompt for {{lessonTitle}} with statement, arguments for/against, and critical questions."
  }
  return base
}

function createPayloadForRange(curriculum: HtmlCurriculum, rangeName: string): CurriculumImportPayload {
  const range = AGE_RANGES.find((r) => r.name === rangeName)
  if (!range) throw new Error(`Unsupported age range: ${rangeName}`)

  const [ageStart, ageEnd] = range.years
  const prompts = buildPromptTemplates(ageStart)
  const difficulty = getDifficultyIndicator(ageStart)

  const subjects = Object.values(curriculum).map((subject, subjectIndex) => {
    const ageStartTopics = subject.content[ageStart] ?? []
    const ageEndTopics = subject.content[ageEnd] ?? []

    const makeLessons = (topics: string[], age: number, startOrder: number) =>
      topics.map((topic, idx) => ({
        title: topic,
        slug: slugify(topic),
        displayOrder: startOrder + idx,
        difficultyIndicator: difficulty,
        content: {
          storyText: `${subject.name} for ages ${rangeName}: ${topic}.`,
          activityInstructions: `Practice activity for ${topic}. Ask learner to explain one real-life example and complete one short task.`,
          quizConcept: `Assess understanding of ${topic} in ${subject.name}.`,
          worksheetExample: `Worksheet exercise on ${topic} with progressive prompts and one reasoning question.`,
          parentTip: `Encourage short daily practice for ${topic} and ask the learner to teach back the idea.`,
        },
        prompts,
      }))

    const units = [
      {
        title: `Age ${ageStart} Focus`,
        slug: `age-${ageStart}-focus`,
        displayOrder: 1,
        lessons: makeLessons(ageStartTopics, ageStart, 1),
      },
      {
        title: `Age ${ageEnd} Focus`,
        slug: `age-${ageEnd}-focus`,
        displayOrder: 2,
        lessons: makeLessons(ageEndTopics, ageEnd, 1000),
      },
    ]

    return {
      name: subject.name,
      slug: slugify(subject.name),
      displayOrder: subjectIndex + 1,
      units,
    }
  })

  return {
    ageGroup: rangeName,
    stageName: range.stageName,
    subjects,
  }
}

export function parseCurriculumHtml(html: string): HtmlCurriculum {
  const marker = "const curriculum ="
  const start = html.indexOf(marker)
  if (start < 0) {
    throw new Error("Could not find curriculum object in HTML")
  }

  const afterStart = html.slice(start + marker.length)
  const endMarker = "\nconst catColors"
  const end = afterStart.indexOf(endMarker)
  if (end < 0) {
    throw new Error("Could not parse curriculum object boundary from HTML")
  }

  const objectLiteral = afterStart.slice(0, end).trim().replace(/;$/, "")

  // The uploaded file already contains JavaScript object literal syntax.
  const parsed = Function(`"use strict"; return (${objectLiteral});`)() as HtmlCurriculum
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Parsed curriculum is invalid")
  }
  return parsed
}

export function buildCurriculumPayloadsFromHtml(html: string) {
  const parsed = parseCurriculumHtml(html)
  return AGE_RANGES.map((range) => ({
    ageGroup: range.name,
    stageName: range.stageName,
    payload: createPayloadForRange(parsed, range.name),
  }))
}
