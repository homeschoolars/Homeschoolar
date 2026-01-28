# Dual-Mode System Architecture

## Overview

The system enforces a strict **dual-mode logic** that separates assessment (non-grading) from learning (grading enabled).

## MODE 1: ASSESSMENT MODE (Non-Grading)

**Purpose:** Understand child's learning baseline and generate diagnostic profile for personalization.

**Characteristics:**
- ✅ NO grades, marks, scores, or pass/fail
- ✅ Diagnostic insights only
- ✅ Learning profiles
- ✅ Discovery-focused, non-judgmental language
- ✅ Focuses on understanding, not evaluation

**Flows:**
- `/api/ai/initial-assessment` - Generates discovery questions
- `/api/ai/complete-assessment` - Generates diagnostic learning profile
- Assessment components (`components/ai/initial-assessment.tsx`)

**Output:**
- Diagnostic Learning Profile with:
  - Concept mastery levels
  - Strength/weakness zones
  - Misconception patterns
  - Learning style signals
  - Priority learning areas
  - Cognitive difficulty fit

**Database:**
- `assessment.rawScore` = 0 (deprecated)
- `assessment.normalizedScore` = 0 (deprecated)
- `assessmentResult.strengths` = diagnostic strength zones
- `assessmentResult.weaknesses` = diagnostic weakness zones
- `assessmentResult.aiSummary` = personalization notes (not scores)

## MODE 2: LEARNING MODE (Grading Enabled)

**Purpose:** Track academic progress, measure performance, and provide feedback on learning activities.

**Characteristics:**
- ✅ Grades, marks, scores, accuracy %
- ✅ Mastery tracking
- ✅ Performance analytics
- ✅ Academic progress dashboards
- ✅ Measurable outcomes for parents

**Flows:**
- `/api/ai/grade-submission` - Grades worksheet submissions
- `/api/ai/grade-quiz` - Grades surprise quizzes
- `/api/ai/lesson-quiz` - Grades lesson quizzes
- Progress tracking (`app/parent/progress`)
- Analytics dashboards (`components/analytics/parent-analytics.tsx`)

**Output:**
- Scores (raw and percentage)
- Graded answers with correctness
- Feedback on performance
- Progress metrics
- Analytics data

**Database:**
- `worksheetSubmission.score` = actual score
- `worksheetSubmission.maxScore` = maximum possible score
- `progress.totalScore` = cumulative scores
- `progress.averageScore` = average performance
- `surpriseQuiz.score` = quiz score

## Hard Rules

### Rule 1: Never Mix Grading into Assessment Mode
- Assessment flows MUST NOT calculate or display scores
- Assessment prompts MUST NOT use grading language
- Assessment UI MUST NOT show marks or grades
- Assessment results MUST NOT include pass/fail indicators

### Rule 2: Never Remove Grading from Learning Mode
- Worksheet/quiz grading MUST calculate scores
- Learning activities MUST track performance
- Parent dashboards MUST show academic progress
- Analytics MUST include measurable metrics

### Rule 3: Data Sharing Between Modes
- Assessment diagnostic profile → Informs learning difficulty/content
- Learning performance data → Can inform future assessments
- Both modes update `learningMemory` and `behavioralMemory`
- Assessment sets initial `curriculumPath`, learning updates it

## Data Flow

```
ASSESSMENT MODE (Non-Grading)
    ↓
Diagnostic Profile
    ↓
[Updates: child.currentLevel, child.learningStyle, curriculumPath, learningMemory]
    ↓
LEARNING MODE (Grading Enabled)
    ↓
Worksheets/Quizzes with Scores
    ↓
[Updates: progress.totalScore, progress.averageScore, learningMemory]
    ↓
Parent Dashboard (Shows Academic Progress)
```

## File Organization

### Assessment Mode Files:
- `services/ai-service.ts` - `completeAssessment()` function
- `services/ai-prompts.ts` - `buildInitialAssessmentPrompt()`, `buildCompleteAssessmentPrompt()`
- `app/api/ai/initial-assessment/route.ts`
- `app/api/ai/complete-assessment/route.ts`
- `components/ai/initial-assessment.tsx`

### Learning Mode Files:
- `services/ai-service.ts` - `gradeSubmission()`, `gradeQuiz()` functions
- `services/ai-prompts.ts` - `buildGradeSubmissionPrompt()`, `buildGradeQuizPrompt()`
- `app/api/ai/grade-submission/route.ts`
- `app/api/ai/grade-quiz/route.ts`
- `components/analytics/parent-analytics.tsx`
- `app/parent/progress/page.tsx`

## Implementation Checklist

- [x] Assessment mode uses diagnostic profiles (no scores)
- [x] Learning mode keeps grading (worksheets/quizzes)
- [ ] Assessment-service.ts refactored to diagnostic mode
- [ ] Mode indicators added to prompts
- [ ] UI text distinguishes assessment vs learning
- [ ] Data flow verified between modes
