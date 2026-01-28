# OpenAI Prompt Improvements Summary

This document summarizes all prompt improvements made to ensure deterministic, schema-safe outputs with anti-hallucination guardrails.

## Overview

All OpenAI prompts have been rewritten to:
1. **Be deterministic and schema-safe** - Explicit schema requirements with validation checklists
2. **Prevent hallucinations** - Strict rules against inventing data not in input
3. **Ensure valid JSON** - Explicit JSON schema requirements and validation instructions
4. **Add guardrails** - Prevent missing keys, malformed responses, and data inconsistencies

## Key Improvements

### 1. Schema Validation Instructions

Every prompt now includes:
- **STRICT OUTPUT SCHEMA** section with exact structure required
- **VALIDATION CHECKLIST** with checkboxes (✓) to verify before output
- **Required vs Optional** fields clearly marked
- **Exact enum values** specified (e.g., "beginner" | "intermediate" | "advanced")
- **Data type requirements** (string, number, array, object) with constraints

### 2. Anti-Hallucination Rules

Every prompt includes:
- **ANTI-HALLUCINATION RULES** section
- Explicit instructions: "NEVER invent", "ONLY use provided data"
- Subject name matching requirements (exact spelling/capitalization)
- Data source requirements (only use provided assessments, interests, etc.)
- Default value instructions when data is missing (empty arrays [], null, or defaults)

### 3. Deterministic Output Requirements

- **Exact counts** specified (e.g., "EXACTLY 15 questions", "5-8 recommendations")
- **Difficulty distributions** specified (e.g., "5 easy, 5 medium, 5 hard")
- **Point totals** calculated and verified
- **Enum values** must match exactly (case-sensitive)
- **Array lengths** must match requirements

### 4. Input Data Validation

- **INPUT PARAMETERS** section clearly lists all inputs
- **USE ONLY THIS DATA** warnings
- **DO NOT INVENT** warnings
- Clear separation between provided data and inferred data

## Updated Prompts

### Static Prompts (`lib/static-prompts.ts`)

#### 1. STATIC_ROADMAP_SYSTEM_PROMPT
- ✅ Added strict schema with all required keys
- ✅ Validation checklist for all fields
- ✅ Anti-hallucination rules (never invent subject names)
- ✅ Exact enum value requirements
- ✅ Evidence array always present requirement

#### 2. STATIC_PROFILE_SYSTEM_PROMPT
- ✅ Added strict schema with all required keys
- ✅ Validation checklist for all fields
- ✅ Anti-hallucination rules (only use provided assessments)
- ✅ Default value instructions (confidence 0 if no data)
- ✅ Evidence array always present requirement

#### 3. STATIC_WORKSHEET_SYSTEM_PROMPT
- ✅ Added strict schema with all required keys
- ✅ Validation checklist (question count, answer key matching, etc.)
- ✅ Anti-hallucination rules (only create questions about specified topic)
- ✅ Exact question type requirements
- ✅ Answer key validation requirements

#### 4. STATIC_QUIZ_SYSTEM_PROMPT
- ✅ Added strict schema with all required keys
- ✅ Validation checklist
- ✅ Anti-hallucination rules
- ✅ Exact question type and answer format requirements

### Dynamic Prompts (`services/ai-prompts.ts`)

#### 1. buildWorksheetPrompt
- ✅ Added CRITICAL output validation warning
- ✅ Exact question count requirement (numQuestions)
- ✅ Validation checklist for all fields
- ✅ Anti-hallucination rules (only topic/subject specified)
- ✅ Answer key and explanations matching requirements

#### 2. buildGradeSubmissionPrompt
- ✅ Added strict output schema
- ✅ Score calculation requirements
- ✅ Validation checklist (graded_answers count, etc.)
- ✅ Anti-hallucination rules (only grade provided answers)

#### 3. buildGenerateQuizPrompt
- ✅ Added strict output schema
- ✅ Exact question count (5 questions)
- ✅ Validation checklist
- ✅ Anti-hallucination rules (only specified subject/topics)

#### 4. buildGradeQuizPrompt
- ✅ Added strict output schema
- ✅ Score calculation requirements
- ✅ Validation checklist
- ✅ Anti-hallucination rules

#### 5. buildInitialAssessmentPrompt
- ✅ Added strict output schema
- ✅ Exact question count (15 questions)
- ✅ Difficulty distribution (5 easy, 5 medium, 5 hard)
- ✅ Point total verification (30 points)
- ✅ Validation checklist
- ✅ Anti-hallucination rules (only specified subject)

#### 6. buildCompleteAssessmentPrompt
- ✅ Added strict output schema
- ✅ Score calculation and level determination rules
- ✅ Validation checklist
- ✅ Anti-hallucination rules (only analyze provided data)

#### 7. buildRecommendCurriculumPrompt
- ✅ Added strict output schema
- ✅ Recommendation count (5-8 items)
- ✅ Validation checklist
- ✅ Anti-hallucination rules (only suggest from provided data)

#### 8. buildCurriculumFromAssessmentPrompt
- ✅ Added strict output schema
- ✅ Subject ID matching requirements (exact match)
- ✅ Topic derivation rules
- ✅ Validation checklist
- ✅ Anti-hallucination rules (only use provided assessments)

#### 9. buildLessonContentPrompt
- ✅ Added strict output schema
- ✅ Section structure requirements (4 sections)
- ✅ Duration requirements (180-300 seconds)
- ✅ Validation checklist
- ✅ Anti-hallucination rules (only concept specified)

#### 10. buildLessonQuizPrompt
- ✅ Added strict output schema
- ✅ Exact question count (20 questions)
- ✅ Difficulty distribution requirements
- ✅ Validation checklist
- ✅ Anti-hallucination rules (only concept specified)

### Learning Profile & Roadmap (`services/learning-profile-service.ts`, `services/roadmap-service.ts`)

#### 1. buildLearningProfilePrompt
- ✅ Added strict output schema
- ✅ Input data validation instructions
- ✅ Default value rules (confidence 0 if no data)
- ✅ Validation checklist
- ✅ Anti-hallucination rules (only use provided assessments/memory)

#### 2. buildRoadmapPrompt
- ✅ Added strict output schema
- ✅ Subject name matching requirements (exact match)
- ✅ Elective subject rules (only if age_band 8-13)
- ✅ Validation checklist
- ✅ Anti-hallucination rules (never invent subject names)

### Blog Content (`services/blog-content-service.ts`)

#### 1. buildBlogContentPrompt
- ✅ Added strict output schema
- ✅ Word count requirements (±10% variance)
- ✅ SEO meta requirements
- ✅ Validation checklist
- ✅ Anti-hallucination rules (only topic specified)

## Validation Patterns

### Common Validation Checklist Items

All prompts now include validation for:
- ✓ Required top-level keys present
- ✓ Array lengths match requirements
- ✓ Enum values match exactly
- ✓ String fields are non-empty (unless optional)
- ✓ Number fields are within valid ranges
- ✓ Object keys match input data exactly
- ✓ No duplicate IDs
- ✓ All IDs are non-empty strings

### Common Anti-Hallucination Rules

All prompts include:
- NEVER invent subject names not in input
- NEVER add data not present in input
- NEVER modify provided names (exact spelling/capitalization)
- ONLY use provided assessment/data
- If data missing, use empty arrays [] or null (per schema)

## Benefits

1. **Reduced Hallucinations**: Explicit rules prevent AI from inventing data
2. **Consistent Output**: Validation checklists ensure schema compliance
3. **Better Error Detection**: Clear requirements make validation failures obvious
4. **Deterministic Results**: Exact counts and distributions ensure consistency
5. **Easier Debugging**: Validation checklists help identify issues quickly

## Testing Recommendations

1. **Schema Validation**: Test that all outputs match schemas exactly
2. **Hallucination Detection**: Verify no invented subject names or data
3. **Count Verification**: Ensure exact question/recommendation counts
4. **Enum Validation**: Verify all enum values match exactly
5. **Missing Data Handling**: Test behavior when input data is incomplete

## Files Modified

- `lib/static-prompts.ts` - All static system prompts
- `services/ai-prompts.ts` - All dynamic prompt builders
- `services/learning-profile-service.ts` - Learning profile prompt
- `services/roadmap-service.ts` - Roadmap prompt
- `services/blog-content-service.ts` - Blog content prompt

## Summary

All OpenAI prompts have been comprehensively rewritten with:
- ✅ Strict schema requirements
- ✅ Validation checklists
- ✅ Anti-hallucination rules
- ✅ Deterministic output requirements
- ✅ Input data validation instructions

This ensures all AI outputs are:
- Schema-compliant
- Free from hallucinations
- Deterministic and consistent
- Properly validated
- Safe for production use
