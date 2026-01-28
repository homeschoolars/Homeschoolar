# 3-Layer Curriculum System Architecture

## Overview

The curriculum system is built on a **3-layer architecture** that ensures personalized, AI-generated, rule-driven, and assessment-informed curriculum for each child.

## Architecture Layers

### LAYER 1: MASTER KNOWLEDGE FRAMEWORK (Static Reference)

**Purpose:** Admin-defined reference blueprint that ensures academic completeness and age safety.

**Location:** `services/master-knowledge-framework.ts`

**Components:**
- **Subjects**: All available subjects in the system
- **Core Competencies**: Essential competencies per subject
- **Skill Progression Ladders**: Foundation → Bridge → Advanced
- **Non-Negotiable Learning Outcomes**: Required outcomes per subject
- **Age-Banded Capability Targets**: Age-appropriate targets (4-7, 8-13)

**Key Features:**
- ✅ Never changes per child (static reference)
- ✅ Serves as blueprint for curriculum generation
- ✅ Enforces academic completeness
- ✅ Ensures age safety (no unsafe content)
- ✅ Defines subject filtering rules (mandatory, conditional, electives)

**Data Structure:**
```typescript
interface MasterKnowledgeFramework {
  subjects: SubjectFramework[]
  ageBands: {
    "4-7": { mandatorySubjects, allowedElectives, maxWeeklyLessons, maxLessonDuration }
    "8-13": { mandatorySubjects, allowedElectives, maxWeeklyLessons, maxLessonDuration }
  }
  religionRules: {
    muslim: { mandatorySubjects, conditionalSubjects }
    non_muslim: { mandatorySubjects, conditionalSubjects }
  }
}
```

### LAYER 2: STUDENT LEARNING PROFILE (Dynamic)

**Purpose:** Unique per-child profile that updates over time as learning progresses.

**Location:** `services/learning-profile-service.ts`, `prisma.schema.StudentLearningProfile`

**Components:**
- **Current Level Per Subject**: Academic level (beginner/intermediate/advanced)
- **Learning Speed**: slow/average/fast
- **Attention Span**: short/medium/long
- **Interest Vectors**: Interest scores (0-100) per subject/topic
- **Cognitive Maturity**: Inferred from age and academic levels
- **Strength/Weakness Signals**: From diagnostic assessments
- **Misconception Patterns**: From diagnostic profile (via assessment results)
- **Learning Style Indicators**: Visual/verbal/logical/applied

**Key Features:**
- ✅ Unique per child
- ✅ Updates dynamically as learning progresses
- ✅ Feeds directly into curriculum generation
- ✅ Generated from diagnostic assessments
- ✅ Includes evidence and confidence scores

**Data Structure:**
```typescript
interface StudentLearningProfile {
  academicLevelBySubject: Record<string, { level: string; confidence: number; evidence: string[] }>
  learningSpeed: "slow" | "average" | "fast"
  attentionSpan: "short" | "medium" | "long"
  interestSignals: Record<string, number> // 0-100
  strengths: Array<{ area: string; evidence: string }>
  gaps: Array<{ area: string; priority: "low" | "medium" | "high"; evidence: string }>
  recommendedContentStyle?: string
}
```

**Source Data:**
- Diagnostic assessments (`assessmentResult.strengths`, `assessmentResult.weaknesses`)
- Learning memory (`learningMemory`)
- Behavioral memory (`behavioralMemory`)
- Performance data (`progress`, `worksheetSubmission`)

### LAYER 3: AI CURRICULUM COMPOSER (Dynamic)

**Purpose:** AI-powered system that generates personalized curriculum using Master Framework + Learning Profile.

**Location:** `services/curriculum-composer-service.ts`

**Input:**
- Master Knowledge Framework (Layer 1)
- Student Learning Profile (Layer 2)
- Child age, interests, religion
- Allowed subjects per age group

**Output:**
```typescript
interface Curriculum {
  studentId: string
  ageBand: string
  subjects: Array<{
    name: string
    entryLevel: "Foundation" | "Bridge" | "Advanced"
    weeklyLessons: number
    teachingStyle: string
    difficultyProgression: "linear" | "adaptive"
    estimatedMastery: string
    microSkills: string[]
    learningGoals: string[]
  }>
  electives?: string[]
  aiNotes: string
}
```

## 5-Step Curriculum Generation Logic

### STEP 1: Subject Filtering

**Rules:**
- **Mandatory Subjects**: All subjects except Islamic Studies and Electives
- **Conditional Subjects**: Islamic Studies (only if religion = Muslim)
- **Electives**: Only if age ≥ 8 (ageBand = "8-13")

**Implementation:**
```typescript
const mandatory = framework.ageBands[ageBand].mandatorySubjects
const conditional = framework.religionRules[religion].mandatorySubjects
const electives = ageBand === "8-13" ? framework.ageBands[ageBand].allowedElectives : []
```

### STEP 2: Entry Level Decision Per Subject

**Logic:**
- Use `academicLevelBySubject` from Learning Profile
- **Very weak** (beginner/low confidence) → **Foundation**
- **Mixed** (intermediate/medium confidence) → **Bridge**
- **Strong** (advanced/high confidence) → **Advanced**

**Implementation:**
```typescript
const academicLevel = learningProfile.academicLevelBySubject[subject]
const entryLevel = academicLevel.level === "beginner" ? "Foundation"
  : academicLevel.level === "intermediate" ? "Bridge"
  : "Advanced"
```

### STEP 3: Subject Curriculum Breakdown

**For Each Subject, Generate:**
- **Learning Goals**: 3-5 specific goals aligned with Master Framework
- **Micro-Skills**: 5-8 micro-skills building toward mastery
- **Weekly Lessons**: Number per week (1-7, respect maxWeeklyLessons)
- **Teaching Style**: Adapt to learning style (visual/story/logic/applied)
- **Difficulty Progression**: "linear" (steady) or "adaptive" (adjusts)
- **Estimated Mastery**: Realistic time estimate (e.g., "8-12 weeks")

### STEP 4: Interest & Personality Weighting

**Adjustments:**
- **Interests**: Emphasize subjects/topics with high interest signals (>70)
- **Attention Span**: If "short", reduce weeklyLessons and lesson duration
- **Learning Style**: Adapt teachingStyle to recommendedContentStyle
- **Strengths**: Build on strong areas identified in assessment
- **Gaps**: Prioritize high-priority gaps in learningGoals

### STEP 5: Guardrails & Safety Rules

**Hard Constraints:**
- ✅ NO unsafe age content (respect age band)
- ✅ NO cognitive overload (respect attention span)
- ✅ Respect maxWeeklyLessons per age band
- ✅ Progressive mastery before level advancement
- ✅ Religion-sensitive content rules
- ✅ Balanced workload per week

## Data Flow

```
ASSESSMENT (Diagnostic Profile)
    ↓
[Updates: Student Learning Profile]
    ↓
LAYER 1: Master Knowledge Framework (Static)
LAYER 2: Student Learning Profile (Dynamic)
    ↓
LAYER 3: AI Curriculum Composer
    ↓
[Generates: Personalized Curriculum JSON]
    ↓
[Stores: LearningRoadmap.roadmapJson, CurriculumPath]
    ↓
LESSON GENERATION (Uses curriculum.learningGoals)
QUIZ GENERATION (Uses curriculum.entryLevel, teachingStyle)
DASHBOARD (Displays curriculum.subjects)
```

## Integration Points

### 1. Lesson Generation
**Uses:**
- `curriculum.subjects[].learningGoals` → Topics for lessons
- `curriculum.subjects[].teachingStyle` → Content format
- `curriculum.subjects[].entryLevel` → Difficulty level

**Location:** `services/ai-content-engine.ts`, `services/ai-prompts.ts` (`buildLessonContentPrompt`)

### 2. Quiz Generation
**Uses:**
- `curriculum.subjects[].entryLevel` → Quiz difficulty
- `curriculum.subjects[].microSkills` → Quiz focus areas

**Location:** `services/ai-lesson-quiz-service.ts`, `services/ai-prompts.ts` (`buildLessonQuizPrompt`)

### 3. Student Dashboard
**Uses:**
- `curriculum.subjects` → Display subjects and progress
- `curriculum.weeklyLessons` → Show lesson schedule
- `curriculum.estimatedMastery` → Show progress timeline

**Location:** `app/student/page.tsx`, `components/dashboards/`

### 4. Adaptive Learning
**Uses:**
- `curriculum.subjects[].difficultyProgression` → Adjust difficulty
- `curriculum.subjects[].entryLevel` → Track advancement
- Learning Profile updates → Regenerate curriculum

**Location:** `services/curriculum-composer-service.ts`

## API Endpoints

### Generate Curriculum
```
POST /api/ai/generate-curriculum
Body: { child_id: string }
Response: { curriculum: Curriculum, message: string }
```

### Get Curriculum (from roadmap)
```
GET /api/student/roadmap
Response: { roadmap: LearningRoadmap }
```

## Files Structure

### Core Services:
- `services/master-knowledge-framework.ts` - Layer 1 (Static Framework)
- `services/learning-profile-service.ts` - Layer 2 (Student Profile)
- `services/curriculum-composer-service.ts` - Layer 3 (AI Composer)

### API Routes:
- `app/api/ai/generate-curriculum/route.ts` - Generate curriculum endpoint

### Database:
- `prisma.schema.StudentLearningProfile` - Stores Layer 2 data
- `prisma.schema.LearningRoadmap` - Stores Layer 3 curriculum JSON
- `prisma.schema.CurriculumPath` - Stores subject-specific paths

## Key Features

### ✅ AI-Generated (Not Static)
- Curriculum is generated dynamically per child
- No static syllabus or templates
- Adapts to child's unique learning profile

### ✅ Rule-Driven
- Master Framework enforces academic completeness
- Age safety rules prevent unsafe content
- Religion rules handle Islamic Studies appropriately

### ✅ Assessment-Informed
- Entry levels based on diagnostic assessments
- Learning profile feeds directly into generation
- Misconception patterns inform curriculum focus

### ✅ Personalized
- Adapts to learning style, interests, attention span
- Adjusts difficulty progression per child
- Balances workload based on capabilities

## Production Readiness

- ✅ 3-layer architecture implemented
- ✅ 5-step generation logic complete
- ✅ Curriculum JSON schema matches specification
- ✅ Integration with lesson/quiz generation
- ✅ Database storage and retrieval
- ✅ API endpoint for curriculum generation
- ✅ Error handling and validation
- ✅ Backward compatibility maintained

---

**Status:** ✅ PRODUCTION READY  
**Architecture:** 3-Layer Curriculum System  
**Generation:** AI-Driven, Rule-Based, Assessment-Informed  
**Personalization:** Per-Child Adaptive Curriculum
