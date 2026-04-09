import { generateText } from "ai"
import { openai, isOpenAIConfigured } from "@/lib/openai"
import type { AssessmentQuiz, AssessmentReport } from "./types-ai"

export async function generateAssessmentReport(
  quiz: AssessmentQuiz,
  answers: Record<string, string | number>,
  childName: string,
  age: number,
): Promise<AssessmentReport> {
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI is not configured")
  }

  const systemPrompt = `
You are an expert child educational psychologist generating a 
comprehensive learning assessment report for a homeschooling platform.

Your report must be:
- Warm, encouraging, and growth-oriented
- Specific to this child's actual answers
- Actionable for the parent
- Never clinical or discouraging

You must calculate and return:

1. SUBJECT SCORES — for each subject:
   - Score out of 100
   - Level: "strong" | "developing" | "needs_support"
   - 1-2 sentence observation

2. IQ ESTIMATE — based on IQ-signal questions:
   - Score: 70-145 range (be realistic and conservative)
   - Category: "Below Average" | "Average" | "Above Average" | "Superior" | "Gifted"
   - Brief explanation

3. EQ ESTIMATE — based on EQ-signal questions:
   - Score: 60-140 range
   - Category: "Developing" | "Average" | "High" | "Very High"
   - Brief explanation

4. MENTAL HEALTH SNAPSHOT:
   - Overall: "Thriving" | "Doing Well" | "Monitor Closely" | "Needs Attention"
   - 1-2 sentence note (parent-facing, warm language)

5. INTEREST PROFILE:
   - Primary: "Creative & Artistic" | "Technical & Logical" | "Humanities & Social" | "Scientific & Curious" | "Musical & Expressive" | "Physical & Kinesthetic"
   - Secondary: same options
   - Confidence: 0-100

6. LEARNING PROFILE:
   - LearnerType: creative label e.g. "Curious Scientific Explorer"
   - PreferredStyle: "Visual" | "Auditory" | "Kinesthetic" | "Reading/Writing" | "Mixed"
   - PaceType: "Fast-paced" | "Steady" | "Needs_more_time"

7. HIDDEN DIFFICULTY LEVEL (never shown to student or parent in UI):
   - Level: 1 (Genius) | 2 (Brilliant) | 3 (Intermediate) | 4 (Mediocre) | 5 (Slow_Learner)
   - Reasoning: brief internal note

8. RECOMMENDATIONS:
   - 5 specific, actionable recommendations for the parent
   - Each linked to a specific subject or signal

9. PARENT MESSAGE:
   - 3-4 warm sentences directly to the parent about their child

OUTPUT: ONLY valid JSON, no markdown.

{
  "childName": "string",
  "age": number,
  "completedAt": "ISO string",
  "subjectScores": [
    {
      "subject": "string",
      "label": "string", 
      "score": number,
      "level": "strong" | "developing" | "needs_support",
      "observation": "string"
    }
  ],
  "iqEstimate": {
    "score": number,
    "category": "string",
    "explanation": "string"
  },
  "eqEstimate": {
    "score": number,
    "category": "string",
    "explanation": "string"
  },
  "mentalHealthSnapshot": {
    "overall": "string",
    "note": "string"
  },
  "interestProfile": {
    "primary": "string",
    "secondary": "string",
    "confidence": number,
    "narrative": "string"
  },
  "learningProfile": {
    "learnerType": "string",
    "preferredStyle": "string",
    "paceType": "string",
    "narrative": "string"
  },
  "hiddenDifficultyLevel": {
    "level": number,
    "label": "string",
    "reasoning": "string"
  },
  "strongSubjects": ["string"],
  "weakSubjects": ["string"],
  "recommendations": [
    {
      "icon": "emoji",
      "title": "string",
      "detail": "string",
      "linkedSubject": "string"
    }
  ],
  "parentMessage": "string",
  "overallSummary": "string"
}
`

  const answersText = Object.entries(answers)
    .map(([qId, ans]) => `Question ${qId}: ${ans}`)
    .join("\n")

  const userPrompt = `
Generate a complete assessment report for:
- Child: ${childName}, Age ${age}
- Assessment mode: ${age <= 6 ? "Parent observation" : "Student direct"}

QUIZ STRUCTURE:
${JSON.stringify(
  quiz.subjects.map((s) => ({
    subject: s.subject,
    questions: s.questions.map((q) => ({
      id: q.id,
      signal: q.signal,
      question: q.question,
      type: q.type,
    })),
  })),
  null,
  2,
)}

ANSWERS GIVEN:
${answersText}

Analyse all answers carefully.
IQ signals are tagged as signal: "iq" — weight these heavily for IQ estimate.
EQ signals are tagged as signal: "eq" — weight these for EQ estimate.
Mental health signals tagged as signal: "mental_health" — use for snapshot.
Interest signals tagged as signal: "interest" — use for interest profile.

Be realistic but encouraging. Never assign IQ below 70 or above 145.
For age 4-6 (parent observation mode), note this is parent-reported, 
not direct testing — reflect this in confidence levels.

Return ONLY valid JSON.
`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    temperature: 0.5,
    maxOutputTokens: 4096,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  })

  const clean = text.replace(/```json|```/g, "").trim()
  return JSON.parse(clean) as AssessmentReport
}
