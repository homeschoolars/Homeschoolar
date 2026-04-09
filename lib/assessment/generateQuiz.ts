import { generateText } from "ai"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import type { AssessmentQuiz } from "./types-ai"

const SUBJECTS = [
  "english",
  "math",
  "science",
  "social_studies",
  "coding",
  "ai",
  "digital_skills",
  "art",
  "music",
  "life_skills",
  "health",
  "finance",
  "communication",
  "islamic_studies",
] as const

const AGE_CONTEXT: Record<number, string> = {
  4: "Age 4 — pre-reader, play-based, parent observation only. All questions must be observable behaviours that a parent can answer by watching their child.",
  5: "Age 5 — kindergarten, visual learner, parent observation only. Questions should reflect what a parent notices at home and during play.",
  6: "Age 6 — early primary, parent observation only. Mix of observable behaviours and very simple direct questions the parent reads aloud.",
  7: "Age 7 — early primary, emerging reader. Simple direct questions the child can attempt with parent support.",
  8: "Age 8 — primary level. Child answers independently. Mix of MCQ and short response.",
  9: "Age 9 — upper primary. Analytical questions beginning. Child answers independently.",
  10: "Age 10 — pre-adolescent. Abstract reasoning questions included. Child answers independently.",
  11: "Age 11 — upper primary to middle school. Critical thinking questions. Child answers independently.",
  12: "Age 12 — middle school. Research-level questions. Child answers independently.",
  13: "Age 13 — early secondary. Academic rigour. Open-ended and analytical questions.",
}

const SUBJECT_FOCUS: Record<string, string> = {
  english: "Assess reading level, vocabulary, comprehension, expression, writing ability",
  math: "Assess number sense, operations, logical reasoning, problem solving, applied math",
  science: "Assess curiosity, observation skills, scientific concepts, cause-effect thinking",
  social_studies: "Assess awareness of self, community, country, world, history, civics",
  coding: "Assess logical sequencing, pattern recognition, computational thinking",
  ai: "Assess awareness of technology, smart devices, and how computers learn",
  digital_skills: "Assess device usage, internet safety, digital literacy",
  art: "Assess creative expression, visual interest, aesthetic sensibility",
  music: "Assess rhythm awareness, musical interest, auditory sensitivity",
  life_skills: "Assess independence, self-care, problem solving, responsibility",
  health: "Assess body awareness, hygiene habits, nutrition knowledge, mental wellbeing",
  finance: "Assess money awareness, saving habits, value understanding",
  communication: "Assess speaking confidence, listening skills, expression clarity",
  islamic_studies: "Assess knowledge of duas, surahs, Islamic values, character and practices",
}

const IQ_EQ_INSTRUCTIONS = `
Additionally embed these signals across the quiz naturally:

IQ SIGNALS (do not label them as IQ — embed naturally):
- Pattern recognition questions
- Logical sequencing problems
- Cause-and-effect reasoning
- Abstract thinking (for age 9+)
- Working memory tasks (remember X, then answer about X later)
- Spatial reasoning (for age 7+)

EQ SIGNALS (do not label them as EQ — embed naturally):
- How does this child handle conflict? (scenario questions)
- Empathy questions (how would your friend feel if...)
- Self-awareness (what do you do when you feel angry/sad?)
- Social awareness (what would you do if someone was left out?)
- Emotional regulation (what helps you calm down?)

MENTAL HEALTH SIGNALS (embed gently — never clinical language):
- Sleep and routine questions
- Enjoyment and engagement with activities
- Feelings about school/learning
- Social connection questions
- Self-confidence indicators
`

export async function generateAssessmentQuiz(
  age: number,
  isMuslim: boolean,
  childName: string,
): Promise<AssessmentQuiz> {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI is not configured")
  }

  const ageClamped = Math.min(13, Math.max(4, Math.round(age)))
  const subjects = isMuslim ? [...SUBJECTS] : SUBJECTS.filter((s) => s !== "islamic_studies")
  const isParentMode = ageClamped <= 6
  const questionsPerSubject = ageClamped <= 6 ? 3 : ageClamped <= 9 ? 4 : 5

  const systemPrompt = `
You are an expert child educational psychologist and curriculum assessor.
Your task is to generate a real-time, personalised assessment quiz for a child.

CHILD: ${childName}, Age ${ageClamped}
MODE: ${isParentMode ? "PARENT OBSERVATION MODE — parent answers on behalf of child" : "STUDENT MODE — child answers directly"}

${AGE_CONTEXT[ageClamped]}

${IQ_EQ_INSTRUCTIONS}

QUESTION TYPES ALLOWED:
${isParentMode
  ? `
- observation_scale: Parent rates child on a 1-5 scale based on observation
- observation_mcq: Parent selects the option that best describes their child
- observation_open: Parent writes a short observation about their child
`
  : `
- mcq: Multiple choice, single answer (4 options)
- scale: Rate 1-5 (used for interests, confidence, frequency)
- open: Short written response (2-4 sentences max expected)
- scenario: A situation described, child picks what they would do
- image_choice: Describe two options in words, child picks one (no actual image needed)
`}

STRICT RULES:
- Generate EXACTLY ${questionsPerSubject} questions per subject
- Each question must serve a clear assessment purpose
- Questions must be age-appropriate in language
- IQ and EQ signal questions must be embedded naturally across subjects
- Mental health signals embedded in life_skills and health sections
- NO clinical language — keep it warm, friendly, encouraging
- For parent mode: address parent directly ("Does your child...")
- For student mode: address child directly ("What do you do when...")
- Islamic Studies only if specified

OUTPUT: Respond with ONLY valid JSON. No markdown. No explanation.

JSON STRUCTURE:
{
  "quizId": "unique_string",
  "age": number,
  "childName": "string",
  "mode": "parent" | "student",
  "totalQuestions": number,
  "subjects": [
    {
      "subject": "string",
      "label": "string",
      "category": "core" | "future" | "creative" | "life",
      "color": "hex color",
      "questions": [
        {
          "id": "q_subj_1",
          "type": "mcq" | "scale" | "open" | "scenario" | "image_choice" | "observation_scale" | "observation_mcq" | "observation_open",
          "signal": "academic" | "iq" | "eq" | "mental_health" | "interest",
          "question": "string",
          "options": ["string"] | null,
          "scaleMin": "string" | null,
          "scaleMax": "string" | null,
          "scoringKey": {
            "0": number, "1": number, "2": number, "3": number
          } | null,
          "openScoring": "length_and_depth" | "vocabulary_level" | "emotional_insight" | null
        }
      ]
    }
  ]
}
`

  const userPrompt = `
Generate a complete assessment quiz for:
- Child name: ${childName}
- Age: ${ageClamped} years old
- Mode: ${isParentMode ? "Parent observation" : "Student direct"}
- Religion: ${isMuslim ? "Muslim (include Islamic Studies)" : "Non-Muslim (exclude Islamic Studies)"}
- Questions per subject: ${questionsPerSubject}

Subjects to cover: ${subjects.join(", ")}

Subject focus areas:
${subjects.map((s) => `- ${s}: ${SUBJECT_FOCUS[s] ?? "General assessment"}`).join("\n")}

Make the quiz feel warm, engaging and age-appropriate.
${isParentMode ? "Address all questions to the parent observer." : `Address all questions directly to ${childName}.`}

Embed IQ signals across: math, coding, science
Embed EQ signals across: communication, life_skills, social_studies
Embed mental health signals in: health, life_skills (2-3 gentle questions total)
Embed interest signals across: art, music, coding, science

Return ONLY valid JSON.
`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0.7,
    maxOutputTokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  })

  const clean = text.replace(/```json|```/g, "").trim()
  const quiz = JSON.parse(clean) as AssessmentQuiz
  return quiz
}
