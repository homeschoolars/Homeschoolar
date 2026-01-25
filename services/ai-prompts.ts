import type { AgeGroup, Difficulty } from "@/lib/types"

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

  return `Create an educational worksheet for homeschooled children.

Subject: ${subjectName}
Age Group: ${ageGroup} years old (${ageGroupDescriptions[ageGroup]})
Difficulty: ${difficulty} (${difficultyDescriptions[difficulty]})
${topic ? `Specific Topic: ${topic}` : ""}
${childLevel ? `Student's Current Level: ${childLevel}` : ""}
Number of Questions: ${numQuestions}

Requirements:
1. Questions should be age-appropriate and engaging
2. Mix question types (multiple choice, true/false, fill in blank, short answer)
3. For multiple choice, provide 4 options with clear distractors
4. Include helpful hints for each question
5. Provide detailed explanations that help the child learn
6. Make it fun and encouraging for children
7. Use simple, clear language appropriate for the age group

Generate a complete worksheet with questions, answer key, and detailed explanations.`
}

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
    question: string
    correct_answer: string
    student_answer: string
    points: number
  }>
}) {
  return `Grade this worksheet submission for a ${ageGroup} year old student.

Worksheet: ${worksheetTitle}
Subject: ${subject}

Questions and Answers:
${questions
  .map(
    (q, i) => `
Question ${i + 1} (${q.points} points): ${q.question}
Correct Answer: ${q.correct_answer}
Student's Answer: ${q.student_answer}
`,
  )
  .join("\n")}

Requirements:
1. Grade each answer fairly, considering partial credit where appropriate
2. Provide encouraging, constructive feedback for each answer
3. Use age-appropriate language (for ${ageGroup} year olds)
4. Be supportive and positive while helping them learn
5. Identify specific areas where they can improve
6. Highlight what they did well
7. Make the feedback fun and motivating

Grade the submission and provide detailed feedback.`
}

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

Subject: ${subjectName}
${recentTopics ? `Recent Topics Studied: ${recentTopics.join(", ")}` : ""}

Requirements:
1. Create exactly 5 quick questions
2. Mix of multiple choice and true/false only (for speed)
3. Make it fun and engaging - this is a "surprise" quiz!
4. Questions should be achievable but slightly challenging
5. Use encouraging, playful language
6. Each question worth 2 points (10 total)
7. Age-appropriate content and vocabulary

Make it exciting! Use fun scenarios and interesting facts.`
}

export function buildGradeQuizPrompt({
  ageGroup,
  questions,
}: {
  ageGroup: string
  questions: Array<{ question: string; correct_answer: string; student_answer: string }>
}) {
  return `Grade this surprise quiz for a ${ageGroup} year old student!

Questions and Answers:
${questions
  .map(
    (q, i) => `
Question ${i + 1}: ${q.question}
Correct Answer: ${q.correct_answer}
Student's Answer: ${q.student_answer}
`,
  )
  .join("\n")}

Requirements:
1. Grade each answer (correct/incorrect)
2. Provide brief, encouraging feedback for each
3. Keep feedback fun and age-appropriate
4. Give an overall encouraging message
5. Include a special encouragement phrase (like "Super Star!" or "Amazing Work!")
6. Be supportive even if they got some wrong`
}

export function buildInitialAssessmentPrompt({ ageGroup, subjectName }: { ageGroup: AgeGroup; subjectName: string }) {
  return `Create an initial assessment to determine a ${ageGroup} year old student's level in ${subjectName}.

Requirements:
1. Create 15 questions of varying difficulty (easy, medium, hard)
2. Start with easier questions and progress to harder ones
3. Cover fundamental concepts for this subject and age group
4. Mix of multiple choice and true/false
5. Each question should test a specific skill
6. Make questions clear and age-appropriate
7. Use encouraging, friendly language
8. Points: Easy (1), Medium (2), Hard (3)

The assessment should help determine if the student is:
- Beginner: Needs to start with foundational concepts
- Intermediate: Has basic understanding, ready for grade-level content
- Advanced: Ready for more challenging material

Create a balanced assessment that accurately gauges the student's level.`
}

export function buildCompleteAssessmentPrompt({
  ageGroup,
  subjectName,
  questions,
}: {
  ageGroup: string
  subjectName: string
  questions: Array<{
    points: number
    skill_tested: string
    correct_answer: string
    student_answer: string
  }>
}) {
  return `Analyze this initial assessment for a ${ageGroup} year old student in ${subjectName}.

Assessment Results:
${questions
  .map(
    (q, i) => `
Question ${i + 1} (${q.points} pts - ${q.skill_tested}): 
Correct: ${q.correct_answer}
Student: ${q.student_answer}
`,
  )
  .join("\n")}

Determine:
1. Their score and recommended level (beginner/intermediate/advanced)
2. Their strengths based on correct answers
3. Areas they need to work on
4. Suggested starting topics for their curriculum

Be encouraging and constructive in the analysis.`
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

Student Profile:
- Name: ${childName}
- Current Level: ${currentLevel}
- Interests: ${interests?.join(", ") || "Not specified"}
- Learning Style: ${learningStyle || "Not assessed"}

Progress Summary:
${progress.map((p) => `- ${p.subject}: ${p.averageScore}% avg, ${p.completedWorksheets} completed`).join("\n") || "No progress data yet"}

Current Curriculum Paths:
${curriculumPaths
  .map((cp) => `- ${cp.subject}: Working on ${cp.currentTopic}, Next: ${cp.nextTopics?.slice(0, 2).join(", ")}`)
  .join("\n") || "No curriculum paths set"}

Recent Performance:
${recentSubmissions.map((s) => `- Score: ${s.score}/${s.maxScore}`).join("\n") || "No recent submissions"}

Generate 5-8 personalized recommendations:
1. Suggest subjects they should focus on
2. Recommend specific topics based on their progress
3. Suggest activities that match their interests
4. Consider their learning level and style
5. Make recommendations encouraging and achievable

Prioritize recommendations (1 = highest priority).`
}
