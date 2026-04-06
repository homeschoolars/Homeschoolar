import type { BankQuestion } from "@/lib/assessment/types"

export const SYSTEM_PROMPT = `You are an expert child education assessor and learning psychologist for HomeSchoolar, 
an AI-powered homeschooling platform for children aged 4-13.

Your role is to analyse a child's assessment results and generate a warm, encouraging, 
deeply personalised learning report for their parent.

TONE RULES:
- Always warm, encouraging, and growth-oriented — never discouraging
- Use the child's name throughout, never "the child" or "they"
- Speak directly to the parent as a knowledgeable friend, not a clinical report
- Celebrate strengths first, frame weaknesses as opportunities
- Be specific — reference actual subjects and scores, not vague generalities
- For ages 4-7: use simpler, playful language
- For ages 8-13: use more detailed, analytical language

OUTPUT FORMAT: You must respond with ONLY valid JSON, no markdown, no preamble.
The JSON must follow this exact structure:

{
  "learnerType": "string — a creative 3-4 word label e.g. 'Curious Scientific Explorer'",
  "interestProfile": "one of: Creative & Artistic | Technical & Logical | Humanities & Social | Balanced All-Rounder | Nature & Science Focused",
  "aptitudeProfile": "one of: Visual-Spatial | Logical-Mathematical | Linguistic-Verbal | Musical | Interpersonal | Intrapersonal | Naturalist | Mixed",
  "overallSummary": "2-3 warm sentences summarising who this child is as a learner. Use their name. Be specific to their scores.",
  "strengthsNarrative": "2-3 sentences about what they are good at and what this means for their future. Reference specific subjects.",
  "growthNarrative": "2-3 sentences about areas to develop, framed positively as opportunities. Never say 'bad at' or 'failed'.",
  "personalityInsight": "1-2 sentences about the child's learning personality (e.g. hands-on doer, deep thinker, creative expresser, social learner) based on the pattern of scores.",
  "careerPathways": ["3 career/interest areas that match this child's profile. Each is a short string e.g. 'Software Engineer', 'Visual Artist', 'Scientist'"],
  "learningStyleTips": ["3 specific, actionable tips for how THIS child learns best based on their profile. Each tip is 1-2 sentences."],
  "subjectRecommendations": [
    {
      "subject": "subject name",
      "status": "strength | developing | needs-support",
      "recommendation": "1-2 specific, actionable sentences for this subject"
    }
  ],
  "weeklyPlanSuggestion": "A suggested weekly learning rhythm e.g. '3 sessions of Math, 2 of English, 1 creative project...' tailored to their profile",
  "parentMessage": "A warm, personal closing message to the parent. 2-3 sentences. Encouraging and specific to their child.",
  "islamicNote": "null OR a 1-2 sentence note on how Islamic values and studies can complement this child's learning profile — only include if Islamic Studies was part of the assessment"
}`

export type PromptScores = Record<string, { pct: number; total: number; max: number }>

export function buildPrompt({
  childName,
  age,
  scores,
  openAnswers,
  questions,
}: {
  childName: string
  age: number
  scores: PromptScores
  openAnswers: Record<number, string>
  questions: Array<{ s: string; q: string; open?: boolean }>
}) {
  const ageGroup =
    age <= 5 ? "early childhood (parent-observed)" : age <= 7 ? "early primary" : age <= 9 ? "mid primary" : age <= 11 ? "upper primary" : "early secondary"

  const sortedScores = Object.entries(scores)
    .sort((a, b) => b[1].pct - a[1].pct)
    .map(([subject, data]) => ({
      subject,
      percentage: Math.round(data.pct),
      status: data.pct >= 70 ? "strong" : data.pct >= 45 ? "developing" : "needs support",
    }))

  const topSubjects = sortedScores.filter((s) => s.status === "strong").map((s) => s.subject)
  const weakSubjects = sortedScores.filter((s) => s.status === "needs support").map((s) => s.subject)

  const creativeScore = Math.round((["art", "music"].reduce((sum, k) => sum + (scores[k]?.pct || 0), 0)) / 2)
  const techScore = Math.round(
    (["coding", "ai", "digital", "math", "science"].reduce((sum, k) => sum + (scores[k]?.pct || 0), 0)) / 5,
  )
  const humanScore = Math.round(
    (["english", "social", "communication", "life"].reduce((sum, k) => sum + (scores[k]?.pct || 0), 0)) / 4,
  )

  const openResponsesText = questions
    .map((q, i) => {
      if (!q.open || !openAnswers[i]) return null
      return `Subject: ${q.s}\nQuestion: ${q.q}\nAnswer: "${openAnswers[i]}"`
    })
    .filter(Boolean)
    .join("\n\n")

  const hasIslamic = "islamic" in scores

  return `
CHILD PROFILE:
Name: ${childName}
Age: ${age} years old
Age group: ${ageGroup}
Assessment type: ${age <= 5 ? "Parent observation mode" : "Direct child assessment"}
Islamic Studies included: ${hasIslamic ? "Yes" : "No"}

SUBJECT SCORES (percentage out of 100):
${sortedScores.map((s) => `- ${s.subject}: ${s.percentage}% (${s.status})`).join("\n")}

CATEGORY AGGREGATES:
- Creative subjects (Art, Music): ${creativeScore}%
- Technical subjects (Coding, AI, Digital, Math, Science): ${techScore}%
- Humanities subjects (English, Social Studies, Communication, Life Skills): ${humanScore}%

TOP STRENGTHS: ${topSubjects.join(", ") || "Still developing across all areas"}
AREAS NEEDING SUPPORT: ${weakSubjects.join(", ") || "None — performing well across the board"}

OPEN-ENDED RESPONSES (written by ${age <= 5 ? "parent" : "child"}):
${openResponsesText || "No open responses recorded"}

TASK:
Generate a complete, personalised assessment report for ${childName} following the exact JSON structure specified.
Remember: warm, encouraging, specific to this child's actual scores and written responses.
`.trim()
}

/** Flat question list for prompt open-question detection */
export function questionsForPrompt(questions: BankQuestion[]): Array<{ s: string; q: string; open?: boolean }> {
  return questions.map((q) => ({
    s: q.subjectLabel,
    q: q.question,
    open: q.type === "open",
  }))
}
