import "server-only"
import type { AdaptiveContentType } from "@/services/adaptive-ai-validation"

export type LessonPromptContext = {
  lessonTitle: string
  subjectName: string
  topicTitle: string
  ageGroupName: string
  storyText: string
  activityInstructions: string
  quizConcept: string
  worksheetExample: string
  parentTip: string
}

export type StudentPromptContext = {
  name: string
  ageYears: number | null
  ageGroupLabel: string
  currentLevel: string
  weakAreas: string[]
  recentScoresPercent: number[]
}

function levelDifficultyGuidance(level: string): string {
  const l = level.toLowerCase()
  if (l === "advanced") {
    return "Difficulty: challenging. Use multi-step reasoning where appropriate. Vocabulary can be slightly richer but still age-appropriate."
  }
  if (l === "intermediate") {
    return "Difficulty: standard grade-level. Clear questions, one main concept per item."
  }
  return "Difficulty: gentle and concrete. Very short sentences, simple words, lots of encouragement."
}

function weakAreaBlock(weakAreas: string[]): string {
  if (!weakAreas.length) {
    return "Weak areas (from prior work): none recorded yet — balance coverage across the lesson."
  }
  return `Weak areas (from prior work): ${weakAreas.slice(0, 8).join("; ")}.
IMPORTANT: For QUIZ generation, approximately 60% of the 10 questions should target these weak areas (rephrase and vary wording). The rest should reinforce the core lesson objective.`
}

function recentPerformanceBlock(scores: number[]): string {
  if (!scores.length) return "Recent performance: no recent quiz scores on file."
  const last = scores.slice(-5)
  return `Recent quiz/worksheet performance (last up to 5 percentages): ${last.join(", ")}%. Use this to calibrate difficulty slightly (lower scores → simpler stems).`
}

export function buildAdaptivePrompt(params: {
  lesson: LessonPromptContext
  student: StudentPromptContext
  contentType: AdaptiveContentType
}): string {
  const { lesson, student, contentType } = params
  const diff = levelDifficultyGuidance(student.currentLevel)

  const common = `You are an expert homeschool educator. Output STRICT JSON only (no markdown, no code fences).

Lesson Title: ${lesson.lessonTitle}
Subject: ${lesson.subjectName}
Topic (unit): ${lesson.topicTitle}
Curriculum age band: ${lesson.ageGroupName}

Student first name: ${student.name}
Student age (years): ${student.ageYears ?? "unknown"}
Student age group: ${student.ageGroupLabel}
Student learning level: ${student.currentLevel}
${diff}

${weakAreaBlock(student.weakAreas)}
${recentPerformanceBlock(student.recentScoresPercent)}

Lesson context (use for accurate content; do not copy verbatim as one block):
- Story seed: ${lesson.storyText.slice(0, 1200)}
- Activities: ${lesson.activityInstructions.slice(0, 800)}
- Quiz concepts: ${lesson.quizConcept.slice(0, 800)}
- Worksheet example: ${lesson.worksheetExample.slice(0, 800)}
- Parent tip: ${lesson.parentTip.slice(0, 400)}
`

  if (contentType === "quiz") {
    return `${common}

TASK: Generate a quiz as JSON with shape:
{ "questions": [ { "question": string, "options": [string,string,string,string], "correctAnswer": string, "explanation": string } ] }

RULES:
- EXACTLY 10 questions.
- Each question: exactly 4 options, all distinct, all plausible.
- correctAnswer MUST equal one of the four options exactly.
- Each question MUST include "explanation": 1–3 short sentences for the child (why the correct answer is right), friendly tone.
- ~60% of questions should probe the weak areas listed above (when weak areas exist); otherwise spread across lesson + quiz concepts.
- Language appropriate for age ${student.ageYears ?? lesson.ageGroupName}.
`
  }

  if (contentType === "worksheet") {
    return `${common}

TASK: Generate a worksheet as JSON with shape:
{
  "title": string,
  "instructions": string,
  "activities": array of 2 OR 3 items. Each item is ONE of:
    { "type": "mcq", "question": string, "options": [4 strings], "correctAnswer": string }
    { "type": "short_answer", "question": string, "hint"?: string }
    { "type": "fill_in_blank", "prompt": string, "answers": string[] }
    { "type": "match", "leftColumn": string[], "rightColumn": string[], "correctPairs": [ { "left": string, "right": string }, ... ] }
}

RULES:
- Exactly 2 or 3 activities total.
- Use a MIX of activity types when possible (not only MCQ).
- fill_in_blank: "prompt" is a sentence with one or more blanks written as _____ (five underscores). "answers" array length MUST equal the number of _____ blanks, in order left-to-right.
- match: leftColumn and rightColumn same length (3–5 items). correctPairs must pair each leftColumn string exactly once with the correct rightColumn string.
- MCQ: exactly 4 options; correctAnswer must match one option exactly.
- short_answer: one clear prompt answerable in 1–3 sentences.
- Friendly, age-appropriate tone.
`
  }

  return `${common}

TASK: Generate a short story JSON with shape:
{ "story": string }

RULES:
- Retell/explain the lesson ideas through a simple story the child can follow.
- Use paragraph breaks: separate paragraphs with a single newline character (\\n) between them.
- Length about 120–280 words unless age is very young (then shorter sentences, fewer words).
- Include a gentle moral or takeaway tied to the lesson.
- No JSON inside the story string; avoid double quotes inside the story (use single quotes if needed).
`
}
