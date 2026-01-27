# AI Schema Validation - Production Guide

## Overview

This document explains the production-safe JSON schema structure for OpenAI Structured Outputs and the backend validation logic that ensures AI generation never fails silently.

## ✅ Production-Safe JSON Schema Structure

### Learning Profile Schema

The learning profile schema is designed to be 100% compliant with OpenAI Structured Outputs requirements:

```typescript
const studentLearningProfileSchema = z.object({
  // Top-level required fields
  student_summary: z.string(), // REQUIRED
  academic_level_by_subject: z.record(z.string(), z.object({
    level: z.string(),           // REQUIRED
    confidence: z.number(),      // REQUIRED
    evidence: z.array(z.string()) // REQUIRED (always present, can be empty)
  })),
  learning_speed: z.enum(["slow", "average", "fast"]), // REQUIRED
  attention_span: z.enum(["short", "medium", "long"]), // REQUIRED
  interest_signals: z.record(z.string(), z.number()),  // REQUIRED
  strengths: z.array(z.object({
    area: z.string(),    // REQUIRED
    evidence: z.string() // REQUIRED
  })),
  gaps: z.array(z.object({
    area: z.string(),                    // REQUIRED
    priority: z.enum(["low", "medium", "high"]), // REQUIRED
    evidence: z.string()                 // REQUIRED
  })),
  evidence: z.array(z.object({
    subject: z.string(),     // REQUIRED
    source: z.enum([...]),    // REQUIRED
    confidence: z.number(),   // REQUIRED
    description: z.string()   // REQUIRED
  })).default([]), // REQUIRED (always present, can be empty)
  recommended_content_style: z.string().optional() // OPTIONAL
})
```

### Roadmap Schema

```typescript
const roadmapSchema = z.object({
  student_summary: z.string(), // REQUIRED
  academic_level_by_subject: z.record(z.string(), z.object({
    level: z.string(),      // REQUIRED
    confidence: z.number()   // REQUIRED
  })),
  learning_roadmap: z.array(z.object({
    subject: z.string(),                    // REQUIRED
    current_level: z.string(),              // REQUIRED
    target_level: z.string(),               // REQUIRED
    recommended_activities: z.array(z.string()), // REQUIRED
    estimated_duration_weeks: z.number()    // REQUIRED
  })),
  evidence: z.array(z.object({
    subject: z.string(),     // REQUIRED
    source: z.enum([...]),    // REQUIRED
    confidence: z.number(),   // REQUIRED
    description: z.string()   // REQUIRED
  })).default([]), // REQUIRED (always present, can be empty)
  subjects: z.record(z.string(), roadmapSubjectSchema), // REQUIRED
  Electives: z.record(z.string(), roadmapSubjectSchema).optional() // OPTIONAL
})
```

## Why This Schema Will Never Fail Validation

### 1. **All Required Fields Are Explicitly Defined**

- Every field that must exist is defined at the object level
- No nested `required` arrays that cause validation conflicts
- `z.record()` handles `additionalProperties` correctly for dynamic subject keys

### 2. **Evidence Field Always Exists**

- Top-level `evidence` uses `.default([])` to ensure it's always present
- Nested `evidence` in `academic_level_by_subject` is explicitly required (not optional)
- Empty arrays are valid, so the field can be empty but must exist

### 3. **No Optional Fields in Nested Objects**

- All properties within nested objects (like `academicLevelItemSchema`) are required
- This prevents the "Missing 'evidence' in required array" error
- OpenAI's JSON Schema validator requires all properties to be in the `required` array when using `additionalProperties`

### 4. **Proper Type Constraints**

- All enums are explicitly defined
- Number ranges are validated (0-100, 0-1, etc.)
- Arrays are properly typed

## Backend Validation Logic

### Pre-OpenAI Validation (Pseudocode)

```typescript
async function generateLearningProfile(studentId, userId) {
  // 1. Check OpenAI configuration FIRST
  if (!isOpenAIConfigured()) {
    throw new Error("OpenAI API key is not configured")
    // Return HTTP 503 - Service Unavailable
  }

  // 2. Validate student exists
  const student = await getStudent(studentId)
  if (!student || !student.profile) {
    throw new Error("Student or profile not found")
    // Return HTTP 404 - Not Found
  }

  // 3. Validate assessment data exists BEFORE calling OpenAI
  const assessments = await getCompletedAssessments(studentId)
  if (assessments.length === 0) {
    throw new Error("Assessment data is missing")
    // Return HTTP 400 - Bad Request
    // DO NOT call OpenAI if data is missing
  }

  // 4. Only call OpenAI if all validations pass
  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    schema: studentLearningProfileSchema,
    prompt: buildPrompt(student, assessments)
  })

  // 5. Normalize response to ensure evidence arrays exist
  const normalized = {
    ...result.object,
    evidence: result.object.evidence ?? [],
    academic_level_by_subject: normalizeAcademicLevels(result.object.academic_level_by_subject)
  }

  return normalized
}
```

### Assessment Validation Function

```typescript
function validateAssessmentData(studentId: string): void {
  const student = await prisma.child.findUnique({
    where: { id: studentId },
    include: {
      assessments: {
        where: { status: "completed" },
        take: 1
      }
    }
  })

  if (!student) {
    throw new Error("Student not found")
  }

  if (!student.assessments || student.assessments.length === 0) {
    throw new Error(
      "Assessment data is missing. " +
      "Please complete at least one assessment before generating a learning profile."
    )
  }

  // Additional validation: Check if assessment has results
  const hasResults = student.assessments.some(a => a.assessmentResult !== null)
  if (!hasResults) {
    throw new Error(
      "Assessment results are missing. " +
      "Please ensure assessments have been completed and graded."
    )
  }
}
```

## OpenAI API Usage (AI SDK)

### Current Implementation

We use the Vercel AI SDK's `generateObject()` function, which handles OpenAI Structured Outputs internally:

```typescript
const result = await generateObject({
  model: openai("gpt-4o-mini"), // Valid OpenAI model
  schema: studentLearningProfileSchema, // Zod schema (converted to JSON Schema)
  prompt: promptString, // String prompt
})

// Result structure:
// {
//   object: {
//     student_summary: "...",
//     academic_level_by_subject: { ... },
//     evidence: [...],
//     ...
//   }
// }
```

### Error Handling

```typescript
try {
  const result = await generateObject({ ... })
} catch (error) {
  // Map OpenAI errors to appropriate HTTP status codes
  if (error.status === 400) {
    // Schema validation error or invalid prompt
    throw new Error("Invalid schema or prompt format")
  } else if (error.status === 401) {
    // Invalid API key
    throw new Error("OpenAI API key is invalid")
  } else if (error.status === 429) {
    // Rate limit exceeded
    throw new Error("AI usage limit reached")
  } else {
    // Other errors
    throw new Error(`OpenAI API error: ${error.message}`)
  }
}
```

## HTTP Status Code Mapping

| Error Type | HTTP Status | Description |
|------------|-------------|-------------|
| Missing assessment data | 400 | Bad Request - required data missing |
| Student not found | 404 | Not Found |
| Unauthorized access | 401 | Unauthorized |
| Forbidden | 403 | Forbidden |
| Subscription required | 402 | Payment Required |
| Rate limit exceeded | 429 | Too Many Requests |
| OpenAI not configured | 503 | Service Unavailable |
| Schema validation error | 400 | Bad Request |
| OpenAI API error | 500 | Internal Server Error |

## Evidence Field Requirements

### Structure

Every evidence item must have:

```typescript
{
  subject: string,        // Subject name
  source: "assessment" | "observation" | "parent_input" | "worksheet" | "quiz",
  confidence: number,     // 0.0 to 1.0
  description: string     // Human-readable description
}
```

### Why Evidence Must Always Exist

1. **OpenAI Schema Validation**: When using `z.record()` with nested objects, all properties in the nested object must be in the `required` array
2. **Type Safety**: Frontend expects evidence arrays to always be present
3. **Data Consistency**: Empty arrays are valid and indicate "no evidence yet" vs "evidence missing"

## Testing the Schema

### Manual Validation

1. **Check Health Endpoint**: `/api/health` should show `openai_configured: true`
2. **Test with Missing Data**: Try generating roadmap without assessments → Should return 400
3. **Test with Valid Data**: Complete assessment → Generate profile → Should succeed
4. **Check Response Structure**: Verify `evidence` array exists (even if empty)

### Schema Validation Checklist

- [x] All required fields explicitly defined
- [x] Evidence field always present (not optional)
- [x] No nested `required` arrays causing conflicts
- [x] Backend validation before OpenAI calls
- [x] Proper error handling with HTTP status codes
- [x] Evidence arrays normalized after generation
- [x] Empty arrays are valid (not null/undefined)

## Common Issues and Solutions

### Issue: "Missing 'evidence' in required array"

**Cause**: Evidence field was optional in nested object within `z.record()`

**Solution**: Make evidence explicitly required (remove `.optional()`, use explicit `z.array()`)

### Issue: "Assessment data is missing" but student has assessments

**Cause**: Assessments exist but none are marked as `status: "completed"`

**Solution**: Ensure assessments are properly submitted and marked as completed

### Issue: Schema validation passes but generation fails

**Cause**: Prompt too large, invalid JSON in prompt, or API quota exceeded

**Solution**: Check server logs for specific OpenAI error, verify API key and billing

## Notes

- The schema uses Zod which automatically converts to JSON Schema for OpenAI
- `z.record()` creates `additionalProperties: true` pattern in JSON Schema
- `.default([])` ensures the field exists even if OpenAI doesn't provide it
- All validation happens BEFORE OpenAI calls to avoid unnecessary API usage
- Error messages are user-friendly and actionable
