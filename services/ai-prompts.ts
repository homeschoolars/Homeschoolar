import type { AgeGroup, Difficulty } from "@/lib/types"
import { type ContentLanguage, ageGroupToBracket } from "@/lib/ai-architecture"

/** Worksheet templates by age (Phase 2 blueprint). One-concept-per-lesson; reinforce concept from lesson. */
const WORKSHEET_TEMPLATE_BY_AGE: Record<string, string> = {
  "4-6": "Prefer: coloring, matching, tracing, simple circling. Minimal text. Reinforce exact concept from lesson; use different examples than any quiz.",
  "7-9": "Prefer: fill-in-blanks, short answers, diagrams to label. Progress from guided to independent practice.",
  "10-13": "Prefer: problem-solving, application exercises, short essays. Deeper application of the concept.",
}

/**
 * MODE: LEARNING (Grading Enabled)
 * 
 * Generates worksheets for learning activities.
 * These worksheets will be graded with scores for parent progress tracking.
 */
export function buildWorksheetPrompt({
  subjectName,
  ageGroup,
  difficulty,
  topic,
  numQuestions,
  childLevel,
}: {
  subjectName: string
  ageGroup: AgeGroup
  difficulty: Difficulty
  topic?: string
  numQuestions: number
  childLevel?: string
}) {
  const ageGroupDescriptions: Record<AgeGroup, string> = {
    "4-5": "preschool/kindergarten level, very simple concepts, lots of visuals, basic recognition",
    "6-7": "early elementary, beginning reading and basic math, simple sentences",
    "8-9": "elementary level, more complex reading, basic arithmetic, introduction to concepts",
    "10-11": "upper elementary, paragraph writing, multi-step math, deeper understanding",
    "12-13": "middle school level, critical thinking, more advanced concepts, longer responses",
  }

  const difficultyDescriptions: Record<Difficulty, string> = {
    easy: "straightforward questions, clear instructions, foundational concepts",
    medium: "moderate challenge, some application required, builds on basics",
    hard: "challenging questions, requires deeper thinking, problem-solving skills",
  }
  const bracket = ageGroupToBracket(ageGroup)
  const templateHint = WORKSHEET_TEMPLATE_BY_AGE[bracket] ?? ""

  return `MODE: LEARNING (Grading Enabled)

Create an educational worksheet for homeschooled children. ONE CONCEPT PER LESSON.

This is LEARNING MODE - worksheets will be graded with scores for parent progress tracking.

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

INPUT PARAMETERS:
- Subject: ${subjectName}
- Age Group: ${ageGroup} years old (${ageGroupDescriptions[ageGroup]})
- Difficulty: ${difficulty} (${difficultyDescriptions[difficulty]})
${topic ? `- Specific Topic: ${topic}` : ""}
${childLevel ? `- Student's Current Level: ${childLevel}` : ""}
- Number of Questions: ${numQuestions} (EXACTLY ${numQuestions} questions required)
${templateHint ? `- Template (age ${bracket}): ${templateHint}` : ""}

STRICT REQUIREMENTS:
1. Output EXACTLY ${numQuestions} questions - no more, no less
2. Questions must be age-appropriate and engaging for ${ageGroup} year olds
3. Mix question types: multiple choice, true/false, fill in blank, short answer
4. Multiple choice questions MUST have exactly 4 options with clear distractors
5. Each question MUST have a unique ID (string, non-empty)
6. Include helpful hints for each question (can be empty string if not applicable)
7. Provide detailed explanations that help the child learn
8. Make it fun and encouraging for children
9. Use simple, clear language appropriate for the age group
10. Focus ONLY on the topic: ${topic || subjectName} - do not add unrelated content

OUTPUT VALIDATION (CHECK BEFORE RESPONDING):
✓ title: non-empty string
✓ description: non-empty string
✓ questions: array with exactly ${numQuestions} items
✓ Each question has: id (unique), type (exact enum), question (non-empty), correct_answer (non-empty), points (integer > 0)
✓ Multiple choice questions have exactly 4 options
✓ answer_key: array with exactly ${numQuestions} items, each question_id matches a question.id
✓ explanations: array with exactly ${numQuestions} items, each question_id matches a question.id
✓ All question IDs are unique and non-empty
✓ All correct answers match their question types correctly

ANTI-HALLUCINATION:
- ONLY create questions about ${topic || subjectName}
- NEVER add questions about unrelated topics
- Ensure all facts are accurate for ${ageGroup} year olds
- Do not invent information not appropriate for this age group

Generate a complete worksheet with questions, answer key, and detailed explanations. Output must be valid JSON.`
}

/**
 * MODE: LEARNING (Grading Enabled)
 * 
 * Grades worksheet submissions with scores and marks.
 * Parents need measurable academic progress.
 */
export function buildGradeSubmissionPrompt({
  ageGroup,
  worksheetTitle,
  subject,
  questions,
}: {
  ageGroup: string
  worksheetTitle: string
  subject: string
  questions: Array<{
    id: string
    question: string
    correct_answer: string
    student_answer: string
    points: number
  }>
}) {
  return `MODE: LEARNING (Grading Enabled)

Grade this worksheet submission for a ${ageGroup} year old student.

This is LEARNING MODE - calculate scores, marks, and provide performance feedback.
Parents need measurable academic progress tracking.

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

INPUT DATA:
- Worksheet: ${worksheetTitle}
- Subject: ${subject}
- Total Questions: ${questions.length}

Questions and Answers:
${questions
  .map(
    (q, i) => `
Question ${i + 1} [ID: ${q.id}] (${q.points} points): ${q.question}
Correct Answer: ${q.correct_answer}
Student's Answer: ${q.student_answer}
`,
  )
  .join("\n")}

STRICT OUTPUT SCHEMA:
{
  "score": number (required, integer >= 0, sum of points for correct answers),
  "max_score": number (required, integer > 0, sum of all question points),
  "graded_answers": array (required, must have exactly ${questions.length} items),
    - Each item: {
        "question_id": string (required, must match question ID from input),
        "answer": string (required, student's answer from input),
        "is_correct": boolean (required, true if matches correct_answer exactly, false otherwise),
        "feedback": string (required, non-empty, encouraging and constructive)
      },
  "overall_feedback": string (required, non-empty, 2-3 sentences),
  "areas_to_improve": array (required, can be empty [], specific areas needing work),
  "strengths": array (required, can be empty [], what student did well)
}

GRADING RULES:
1. Grade each answer fairly - is_correct is true ONLY if student_answer matches correct_answer exactly (case-insensitive for text)
2. Calculate score as sum of points for correct answers
3. max_score is sum of all question points
4. Provide encouraging, constructive feedback for each answer
5. Use age-appropriate language (for ${ageGroup} year olds)
6. Be supportive and positive while helping them learn
7. Identify specific areas where they can improve
8. Highlight what they did well
9. Make the feedback fun and motivating

OUTPUT VALIDATION (CHECK BEFORE RESPONDING):
✓ score: integer >= 0, <= max_score
✓ max_score: integer > 0, equals sum of all question points
✓ graded_answers: array with exactly ${questions.length} items
✓ Each graded_answer.question_id matches a question from input
✓ Each graded_answer.is_correct is boolean
✓ Each graded_answer.feedback is non-empty string
✓ overall_feedback: non-empty string (2-3 sentences)
✓ areas_to_improve: array (can be empty)
✓ strengths: array (can be empty)

ANTI-HALLUCINATION:
- ONLY grade the answers provided - do not invent additional questions or answers
- Use exact matching for correctness (case-insensitive for text answers)
- Base feedback only on the provided student answers

Grade the submission and provide detailed feedback. Output must be valid JSON.`
}

/**
 * MODE: LEARNING (Grading Enabled)
 * 
 * Generates quiz questions for learning activities.
 * These quizzes will be graded with scores.
 */
export function buildGenerateQuizPrompt({
  ageGroup,
  subjectName,
  recentTopics,
}: {
  ageGroup: AgeGroup
  subjectName: string
  recentTopics?: string[]
}) {
  return `Create a fun surprise quiz for a ${ageGroup} year old student!

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

INPUT PARAMETERS:
- Subject: ${subjectName}
- Recent Topics Studied (MUST prioritize these): ${recentTopics?.length ? recentTopics.join(", ") : "Use only previously studied core topics from this subject"}
- Age Group: ${ageGroup} years old

STRICT REQUIREMENTS:
1. Create EXACTLY 20 questions - no more, no less
2. Mix of multiple choice and true/false ONLY
3. Make it fun and engaging - this is a "surprise" quiz!
4. Questions should be achievable but slightly challenging
5. Use encouraging, playful language
6. Each question worth 1 point (20 total points)
7. Age-appropriate content and vocabulary for ${ageGroup} year olds
8. Focus ONLY on ${subjectName} and topics the child has already studied
9. Do not introduce brand-new topics the child has not covered yet

STRICT OUTPUT SCHEMA:
{
  "questions": array (required, must have exactly 20 items),
    - Each question: {
        "id": string (required, unique, non-empty),
        "type": "multiple_choice" | "true_false" (required, exact match),
        "question": string (required, non-empty),
        "options": string[] (required if type is "multiple_choice", must have exactly 4 items),
        "correct_answer": string (required, non-empty),
          - For multiple_choice: must match one of the options exactly
          - For true_false: must be exactly "True" or "False",
        "points": number (required, must be 1)
      }
}

OUTPUT VALIDATION (CHECK BEFORE RESPONDING):
✓ questions: array with exactly 20 items
✓ Each question has: id (unique, non-empty), type (exact enum), question (non-empty), correct_answer (non-empty), points (exactly 1)
✓ Multiple choice questions have exactly 4 options
✓ correct_answer for multiple_choice matches one of the options exactly
✓ correct_answer for true_false is exactly "True" or "False"
✓ All question IDs are unique and non-empty
✓ Total points = 20 (20 questions × 1 point)

ANTI-HALLUCINATION:
- ONLY create questions about ${subjectName} and already-studied topics
- NEVER add questions about unrelated subjects or topics
- Ensure all facts are accurate for ${ageGroup} year olds
- Do not invent information not appropriate for this age group

Make it exciting! Use fun scenarios and interesting facts. Output must be valid JSON.`
}

/**
 * MODE: LEARNING (Grading Enabled)
 * 
 * Grades surprise quizzes with scores and marks.
 * Tracks academic performance for parent dashboards.
 */
export function buildGradeQuizPrompt({
  ageGroup,
  questions,
}: {
  ageGroup: string
  questions: Array<{ id: string; question: string; correct_answer: string; student_answer: string; points: number }>
}) {
  return `MODE: LEARNING (Grading Enabled)

Grade this surprise quiz for a ${ageGroup} year old student!

This is LEARNING MODE - calculate scores, marks, and provide performance feedback.
Parents need measurable academic progress tracking.

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

INPUT DATA:
- Total Questions: ${questions.length}

Questions and Answers:
${questions
  .map(
    (q, i) => `
Question ${i + 1} [ID: ${q.id}] (${q.points} point${q.points === 1 ? "" : "s"}): ${q.question}
Correct Answer: ${q.correct_answer}
Student's Answer: ${q.student_answer}
`,
  )
  .join("\n")}

STRICT OUTPUT SCHEMA:
{
  "score": number (required, integer >= 0, sum of points for correct answers),
  "graded_answers": array (required, must have exactly ${questions.length} items),
    - Each item: {
        "question_id": string (required, must match question ID from input),
        "is_correct": boolean (required, true if student_answer matches correct_answer exactly, false otherwise),
        "feedback": string (required, non-empty, brief and encouraging)
      },
  "overall_feedback": string (required, non-empty, 2-3 sentences, encouraging),
  "encouragement": string (required, non-empty, special phrase like "Super Star!" or "Amazing Work!")
}

GRADING RULES:
1. Grade each answer - is_correct is true ONLY if student_answer matches correct_answer exactly (case-insensitive)
2. Calculate score as sum of points for correct answers
3. Provide brief, encouraging feedback for each answer
4. Keep feedback fun and age-appropriate for ${ageGroup} year olds
5. Give an overall encouraging message (2-3 sentences)
6. Include a special encouragement phrase (like "Super Star!" or "Amazing Work!")
7. Be supportive even if they got some wrong

OUTPUT VALIDATION (CHECK BEFORE RESPONDING):
✓ score: integer >= 0
✓ graded_answers: array with exactly ${questions.length} items
✓ Each graded_answer.question_id matches a question from input
✓ Each graded_answer.is_correct is boolean
✓ Each graded_answer.feedback is non-empty string
✓ overall_feedback: non-empty string (2-3 sentences)
✓ encouragement: non-empty string (special phrase)

ANTI-HALLUCINATION:
- ONLY grade the answers provided - do not invent additional questions or answers
- Use exact matching for correctness (case-insensitive)
- Base feedback only on the provided student answers

Grade the quiz and provide detailed feedback. Output must be valid JSON.`
}


export function buildRecommendCurriculumPrompt({
  ageGroup,
  childName,
  currentLevel,
  interests,
  learningStyle,
  progress,
  curriculumPaths,
  recentSubmissions,
}: {
  ageGroup: string
  childName: string
  currentLevel: string
  interests: string[]
  learningStyle: string | null
  progress: Array<{ subject: string; averageScore: number; completedWorksheets: number }>
  curriculumPaths: Array<{ subject: string; currentTopic: string | null; nextTopics: string[] | null }>
  recentSubmissions: Array<{ score: number; maxScore: number }>
}) {
  return `Generate personalized curriculum recommendations for a ${ageGroup} year old student.

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

INPUT DATA:
- Student Name: ${childName}
- Age Group: ${ageGroup} years old
- Current Level: ${currentLevel}
- Interests: ${interests?.join(", ") || "Not specified"}
- Learning Style: ${learningStyle || "Not assessed"}

Progress Summary:
${progress.map((p) => `- ${p.subject}: ${p.averageScore}% avg, ${p.completedWorksheets} completed`).join("\n") || "No progress data yet"}

Current Curriculum Paths:
${curriculumPaths
  .map((cp) => `- ${cp.subject}: Working on ${cp.currentTopic || "none"}, Next: ${cp.nextTopics?.slice(0, 2).join(", ") || "none"}`)
  .join("\n") || "No curriculum paths set"}

Recent Performance:
${recentSubmissions.map((s) => `- Score: ${s.score}/${s.maxScore}`).join("\n") || "No recent submissions"}

STRICT OUTPUT SCHEMA:
{
  "recommendations": array (required, must have 5-8 items),
    - Each item: {
        "type": "subject" | "topic" | "worksheet" | "activity" (required, exact match),
        "title": string (required, non-empty),
        "description": string (required, non-empty, 1-2 sentences),
        "reason": string (required, non-empty, explains why this recommendation fits the student),
        "priority": number (required, integer 1-10, where 1 = highest priority)
      }
}

REQUIREMENTS:
1. Generate 5-8 personalized recommendations (exactly 5-8, no more, no less)
2. Mix recommendation types: subjects, topics, worksheets, activities
3. Base recommendations ONLY on provided data:
   - Progress summary (subjects with low scores need attention)
   - Current curriculum paths (suggest next steps)
   - Interests (align activities with interests)
   - Learning level and style (appropriate difficulty and format)
4. Make recommendations encouraging and achievable
5. Prioritize: 1 = highest priority, 10 = lower priority
6. Each recommendation must have a clear reason tied to the student's profile

OUTPUT VALIDATION (CHECK BEFORE RESPONDING):
✓ recommendations: array with 5-8 items
✓ Each recommendation has: type (exact enum), title (non-empty), description (non-empty), reason (non-empty), priority (integer 1-10)
✓ Priorities are unique or appropriately distributed (1-10 range)
✓ Recommendations are based on provided data only
✓ No invented subjects or topics not mentioned in input

ANTI-HALLUCINATION:
- ONLY suggest subjects/topics mentioned in progress or curriculum paths
- NEVER invent new subjects or topics not in the input data
- Base recommendations strictly on provided progress, curriculum paths, and interests
- If data is limited, use general recommendations but stay within provided context

Prioritize recommendations (1 = highest priority). Output must be valid JSON.`
}

/** Generate curriculum plan from assessment results. Used for initial plan and regenerate. */
export function buildCurriculumFromAssessmentPrompt({
  childName,
  ageGroup,
  learningStyle,
  assessments,
}: {
  childName: string
  ageGroup: string
  learningStyle: string | null
  assessments: Array<{
    subjectId: string
    subjectName: string
    recommendedLevel: string
    strengths: string[]
    weaknesses: string[]
    suggestedTopics: string[]
  }>
}) {
  return `Generate a personalized CURRICULUM PLAN for ${childName} (${ageGroup} years). Learning style: ${learningStyle || "not yet assessed"}.

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

INPUT DATA:
- Student Name: ${childName}
- Age Group: ${ageGroup} years old
- Learning Style: ${learningStyle || "not yet assessed"}
- Number of Subjects: ${assessments.length}

Assessment results per subject:
${assessments
  .map(
    (a) =>
      `- ${a.subjectName} (ID: ${a.subjectId}): level ${a.recommendedLevel}. Strengths: ${(a.strengths ?? []).join(", ") || "none"}. Areas to work on: ${(a.weaknesses ?? []).join(", ") || "none"}. Suggested topics: ${(a.suggestedTopics ?? []).join(", ") || "none"}.`
  )
  .join("\n")}

STRICT OUTPUT SCHEMA:
{
  "subjects": array (required, must have exactly ${assessments.length} items, one per assessment),
    - Each item: {
        "subject_id": string (required, must match exact subjectId from input),
        "subject_name": string (required, must match exact subjectName from input),
        "current_topic": string (required, non-empty, one concrete starting topic),
        "next_topics": array (required, must have 4-6 items, ordered strings),
        "rationale": string (optional, one short sentence explaining why this plan fits the child)
      },
  "summary": string (optional, 2-3 sentences for parent, no jargon)
}

REQUIREMENTS FOR EACH SUBJECT:
1. subject_id: Use EXACT id from input assessment (${assessments.map(a => a.subjectId).join(", ")})
2. subject_name: Use EXACT name from input assessment
3. current_topic: One concrete starting topic
   - Prefer topics from suggestedTopics if available
   - Otherwise derive from recommendedLevel (beginner = foundational, intermediate = grade-level, advanced = challenging)
   - Must be appropriate for ${ageGroup} year olds
4. next_topics: 4-6 ordered topics for next weeks/months
   - Build on strengths from assessment
   - Address weaknesses from assessment
   - Progress logically from current_topic
   - Must be appropriate for ${ageGroup} year olds and recommendedLevel
5. rationale: One short sentence explaining why this plan fits the child (optional)

SUMMARY REQUIREMENTS:
- 2-3 sentences for parent
- No educational jargon
- Focus on what the child will learn and why

OUTPUT VALIDATION (CHECK BEFORE RESPONDING):
✓ subjects: array with exactly ${assessments.length} items
✓ Each subject has: subject_id (matches input exactly), subject_name (matches input exactly), current_topic (non-empty), next_topics (array with 4-6 items)
✓ All subject_ids match input assessment subjectIds exactly
✓ All subject_names match input assessment subjectNames exactly
✓ All next_topics arrays have 4-6 items
✓ summary: optional, if present must be 2-3 sentences

ANTI-HALLUCINATION:
- ONLY use subject IDs and names from the provided assessments
- NEVER invent new subjects or modify subject names
- Base topics on suggestedTopics, recommendedLevel, strengths, and weaknesses from input
- Do not add topics unrelated to the subject or inappropriate for the age/level
- If suggestedTopics is empty, derive topics from recommendedLevel and subject area only

Generate the curriculum plan. Output must be valid JSON.`
}

/**
 * Phase 1: AI Content Engine – story-based video script (3–5 min, one-concept-per-lesson)
 * 
 * Uses curriculum data (optional):
 * - topic from curriculum.learningGoals
 * - teachingStyle from curriculum (adapts content format)
 * - entryLevel from curriculum (adjusts difficulty)
 */
export function buildLessonContentPrompt({
  subject,
  topic,
  conceptId,
  targetAge,
  language,
  teachingStyle,
  entryLevel,
}: {
  subject: string
  topic: string
  conceptId: string
  targetAge: AgeGroup
  language: ContentLanguage
  teachingStyle?: string
  entryLevel?: "Foundation" | "Bridge" | "Advanced"
}) {
  const bracket = ageGroupToBracket(targetAge)
  const vocabRule =
    bracket === "4-6"
      ? "very simple words, short sentences, visual cues"
      : bracket === "7-9"
        ? "clear vocabulary, 1–2 step explanations"
        : "grade-appropriate terms, multi-step reasoning"
  const cultural =
    language === "roman_urdu"
      ? "Use local examples (cricket, Rupees, metric, Pakistani names like Ali/Sara). Roman Urdu where helpful. Culturally familiar scenarios."
      : "Use clear, neutral examples. English throughout."

  const teachingStyleNote = teachingStyle ? `- Teaching Style (from curriculum): ${teachingStyle} - adapt content format accordingly` : ""
  const entryLevelNote = entryLevel ? `- Entry Level (from curriculum): ${entryLevel} - adjust difficulty appropriately` : ""
  const culturalNote = cultural ? `- Cultural Context: ${cultural}` : ""

  return `Create a story-based VIDEO SCRIPT for a homeschool lesson.

CRITICAL: Output MUST be valid JSON matching the exact schema. Verify all required keys are present before responding.

INPUT PARAMETERS:
- Subject: ${subject}
- Topic: ${topic}
- Concept ID: ${conceptId} (ONE CONCEPT ONLY)
- Target Age: ${targetAge} (bracket ${bracket})
- Vocabulary Level: ${vocabRule}
- Language: ${language}
${teachingStyleNote}
${entryLevelNote}
${culturalNote}

SAFETY REQUIREMENTS:
- Age-appropriate content for ${targetAge} year olds (4–13)
- Educationally sound
- Culturally sensitive
- Safe and positive messaging

STRICT REQUIREMENTS:
1. ONE CONCEPT ONLY: ${conceptId} - never combine multiple complex ideas
2. Single concept focus throughout entire script
3. Age-adjusted vocabulary: ${vocabRule}
4. Structure: 3–5 minutes total (180–300 seconds)
5. ${cultural}

STRICT OUTPUT SCHEMA:
{
  "title": string (required, non-empty, lesson title),
  "concept_id": string (required, must match "${conceptId}" exactly),
  "age_bracket": string (required, must match "${bracket}" exactly),
  "vocabulary_level": string (required, describes vocabulary for ${targetAge} year olds),
  "sections": array (required, must have exactly 4 items),
    - Section 1 (Hook): {
        "label": "Hook" (required),
        "duration_estimate_sec": number (required, 30-45),
        "script": string (required, non-empty, engaging opener linking to child's world),
        "examples": array (required, can be empty []),
        "interactive_prompts": array (required, can be empty [])
      },
    - Section 2 (Explain): {
        "label": "Explain" (required),
        "duration_estimate_sec": number (required, 60-90),
        "script": string (required, non-empty, explains single concept with exactly 3 examples),
        "examples": array (required, must have exactly 3 items, explanatory examples),
        "interactive_prompts": array (required, can be empty [])
      },
    - Section 3 (Interactive): {
        "label": "Interactive" (required),
        "duration_estimate_sec": number (required, 60-90),
        "script": string (required, non-empty),
        "examples": array (required, can be empty []),
        "interactive_prompts": array (required, must have 2-3 items, prompts for child to respond)
      },
    - Section 4 (Recap): {
        "label": "Recap" (required),
        "duration_estimate_sec": number (required, 30),
        "script": string (required, non-empty, brief summary with positive close),
        "examples": array (required, can be empty []),
        "interactive_prompts": array (required, can be empty [])
      },
  "total_duration_estimate_sec": number (required, integer 180-300, sum of all section durations)
}

OUTPUT VALIDATION (CHECK BEFORE RESPONDING):
✓ title: non-empty string
✓ concept_id: exactly "${conceptId}"
✓ age_bracket: exactly "${bracket}"
✓ vocabulary_level: non-empty string
✓ sections: array with exactly 4 items
✓ Each section has: label (exact match), duration_estimate_sec (number), script (non-empty), examples (array), interactive_prompts (array)
✓ Explain section has exactly 3 examples
✓ Interactive section has 2-3 interactive_prompts
✓ total_duration_estimate_sec: integer 180-300, equals sum of section durations
✓ All durations are realistic and add up correctly

ANTI-HALLUCINATION:
- ONLY focus on concept ${conceptId} - never add unrelated concepts
- NEVER combine multiple complex ideas
- Ensure all examples relate directly to ${conceptId}
- Do not add content inappropriate for ${targetAge} year olds
- Stay within ${subject} and ${topic} scope only

Output a structured script. Output must be valid JSON.`
}

/**
 * Phase 1: AI Lesson Quiz – 20 MCQs per lesson, 4 options, distractors reveal misunderstandings
 * 
 * Uses curriculum data (optional):
 * - entryLevel from curriculum (adjusts quiz difficulty)
 * - microSkills from curriculum (focus quiz on these skills)
 */
export function buildLessonQuizPrompt({
  subject,
  topic,
  conceptId,
  ageGroup,
  lessonSummary,
  recentTopics,
  entryLevel,
  microSkills,
}: {
  subject: string
  topic: string
  conceptId: string
  ageGroup: AgeGroup
  lessonSummary?: string
  recentTopics?: string[]
  entryLevel?: "Foundation" | "Bridge" | "Advanced"
  microSkills?: string[]
}) {
  const bracket = ageGroupToBracket(ageGroup)
  const difficultyRule =
    bracket === "4-6"
      ? "Visual-heavy, simple language. Minimal text. Focus on recognition and simple choices."
      : bracket === "7-9"
        ? "Text-based, 2-step reasoning. Clear scenarios."
        : "Applied concepts, multi-step problems. Test deeper understanding."

  const entryLevelNote = entryLevel ? `Entry Level (from curriculum): ${entryLevel} - adjust difficulty accordingly` : ""
  const microSkillsNote = microSkills?.length ? `Focus on micro-skills: ${microSkills.join(", ")}` : ""

  return `Create a LESSON QUIZ: exactly 20 multiple-choice questions for the lesson.

Subject: ${subject}. Topic: ${topic}. Concept: ${conceptId}.
Age group: ${ageGroup} (${bracket}). ${difficultyRule}
${entryLevelNote}
${microSkillsNote}
${lessonSummary ? `Lesson summary: ${lessonSummary}` : ""}
${recentTopics?.length ? `Recent topics (avoid overlap): ${recentTopics.join(", ")}` : ""}

RULES:
- Exactly 20 MCQs. 4 options each: 1 correct, 3 plausible distractors.
- Distractors must reveal specific misunderstandings (e.g. common confusion, typical slip).
- NO ROTE MEMORY. Every question must test conceptual understanding.
- Mix difficulty: easy (~6), medium (~8), hard (~6). Points: easy 1, medium 2, hard 3.
- Each question: id, question, options [4 strings], correct_answer, skill_tested, difficulty, points.
- Optional: distractor_rationale object (key = wrong option, value = why it’s a plausible mistake).

Output only the questions array.`
}
