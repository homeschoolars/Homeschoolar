# Homeschoolars AI Architecture

Lead AI Architect blueprints: **safety-first**, **one-concept-per-lesson**, **adaptive**, **multi-language** (EN / Roman Urdu).

---

## Principles

1. **Safety first** – Age-appropriate (4–13), educationally sound, culturally sensitive.
2. **One-concept-per-lesson** – No combining multiple complex concepts in a single lesson.
3. **Adaptive learning** – Content adapts to pace and mastery.
4. **Multi-language** – English and Roman Urdu (cultural localization, not just translation).

---

## Implementation Overview

| Phase | Components | Status |
|-------|------------|--------|
| **1 (Core MVP)** | Content Engine, Lesson Quiz (20 MCQs), Assessment Engine | ✅ Implemented |
| **2** | Worksheet templates, Long-term memory, Parent dashboard | ✅ Partially (templates, insights, memory) |
| **3** | Next-topic recommendation, Difficulty adjustment, Multi-language | 🔲 Planned |
| **4** | AI Teacher Assistant | 🔲 Design specs only |

---

## 1. AI Content Generation Engine (Phase 1)

**Input:** `subject`, `topic`, `target_age`, `language`, `concept_id`  
**Output:** Story-based video script (3–5 min), age-adjusted vocabulary, single concept, 3 examples, interactive prompts.

- **Service:** `services/ai-content-engine.ts`
- **API:** `POST /api/ai/lesson-content`
- **Cache:** `LessonContent` by `(subjectId, topic, conceptId, ageGroup, language)`

---

## 2. AI Lesson Quiz – 20 MCQs (Phase 1)

**Rules:** 20 MCQs per lesson, 4 options (1 correct, 3 plausible distractors), distractors reveal misunderstandings. Age-scaled:

- **4–6:** Visual-heavy, simple language.
- **7–9:** Text-based, 2-step reasoning.
- **10–13:** Applied concepts, multi-step.

No rote-memory questions; all test conceptual understanding.

- **Service:** `services/ai-lesson-quiz-service.ts`
- **API:** `POST /api/ai/lesson-quiz`
- **Cache:** `LessonQuiz` by `(subjectId, topic, conceptId, ageGroup)`

---

## 3. AI Worksheet Generator (Phase 2)

**Templates by age:**

- **4–6:** Coloring, matching, tracing, simple circling.
- **7–9:** Fill-in-blanks, short answers, diagrams to label.
- **10–13:** Problem-solving, application exercises, short essays.

Each worksheet reinforces the exact lesson concept; uses different examples than the quiz; progresses from guided to independent practice.

- **Prompts:** `buildWorksheetPrompt` in `services/ai-prompts.ts` (template hints by age).
- **Service:** `generateWorksheet` in `services/ai-service.ts`.

---

## 4. AI Assessment Engine – Learning Brain (Phase 1)

**Tracking:**

- Concept mastery score (0–100) per concept.
- Error pattern detection: `conceptual_misunderstanding` | `procedural_error` | `attention_lapse` | `language_barrier`.
- Learning velocity (time to mastery).

**Actionable insights:** e.g. “Child struggles with subtraction with borrowing across zeros”, “Consistently confuses photosynthesis with respiration”, “Shows improvement in geometric shapes recognition”.

- **Service:** `services/assessment-engine-service.ts`
- **API:** `GET /api/parent/children/[id]/assessment-signals`
- **Memory:** `LearningMemory` stores `masteryLevel`, `evidence` (including `error_patterns`).  
  `memory-service.updateLearningMemoryFromAssessment` supports `errorPatterns` and `masteryScores`.

---

## 5. Long-Term Learning Memory (Phase 2)

**Per-child structure:** Concept history, first encounter, mastery achieved, retention score, error patterns, learning-style signals.

- **Storage:** `LearningMemory` (concept, mastery, evidence), `BehavioralMemory` (attention, style, triggers).
- **Service:** `services/memory-service.ts`.

---

## 6. Next-Topic Recommendation (Phase 3)

**Decision tree:** Quiz performance (>80% to advance), prerequisites, age-appropriateness, subject rotation, review cycles for weak areas.  
**Output:** Next 3 recommended lessons with rationale.

- **Planned:** `services/ai-service.recommendCurriculum` to align with `lib/ai-architecture.NEXT_TOPIC_RULES`.

---

## 7. Parent Insight Dashboard (Phase 2)

**Weekly summary template:** Mastered, Improving, Needs Attention; Try this activity; Review concept; Celebrate; Next week preview. No jargon, positive framing, 3–5 bullets, actionable.

- **Service:** `services/insights-service.getChildInsights`
- **API:** `GET /api/parent/children/[id]/insights`  
  Response includes `weekly_summary` (mastered, improving, needs_attention, try_this_activity, review_concept, celebrate, next_week_preview).

---

## 8. Difficulty Adjustment (Phase 3)

**Rules:** If mastery &lt; 60% → more examples, visuals, slower pace; if &gt; 90% → extensions, advanced concept, faster pace.  
**Tiers:** Foundational | Standard | Advanced.

- **Constants:** `lib/ai-architecture.DIFFICULTY_TIERS`, `MASTERY_THRESHOLDS`.

---

## 9. Multi-Language – Roman Urdu (Phase 3)

**Localization:** Local examples (cricket, Rupees, metric), familiar names (Ali, Sara), cultural context, phonetic readability.

- **Content engine:** `buildLessonContentPrompt` supports `language: "en" | "roman_urdu"`.
- **Constants:** `lib/ai-architecture.LOCALIZATION`.

---

## 10. AI Teacher Assistant (Phase 4)

**Design only:** Syllabus-only answers, verified against approved knowledge base, no open-ended philosophy, age-filtered.  
Response: answer → example → related lesson → practice activity.

---

## Technical Constraints

- **Determinism:** Same inputs → same outputs where possible (e.g. cached lesson content/quiz).
- **Cacheability:** `LessonContent` and `LessonQuiz` stored in DB; reuse by `(subject, topic, concept, age, language)`.
- **Privacy:** No PII in training data.
- **Scale:** Designed for 100k+ learners (stateless services, DB-backed cache).

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/ai-architecture.ts` | Blueprints, constants, types (age brackets, error categories, mastery thresholds, cache keys). |
| `services/ai-prompts.ts` | All AI prompts (content, lesson quiz, worksheet, assessment, insights). |
| `services/ai-content-engine.ts` | Video script generation, cache read/write. |
| `services/ai-lesson-quiz-service.ts` | 20-MCQ lesson quiz, cache read/write. |
| `services/assessment-engine-service.ts` | Error categorization, mastery, insight signals. |
| `services/memory-service.ts` | Learning memory updates (mastery, error patterns). |
| `services/insights-service.ts` | Parent insights + weekly summary template. |

---

## Migration

Run:

```bash
pnpm exec prisma migrate deploy
```

Migration `20260125000000_ai_lesson_content_quiz` adds `lesson_contents` and `lesson_quizzes`.

---

## Testing (per feature)

1. Age-appropriateness validation  
2. Concept accuracy check  
3. Cultural sensitivity review  
4. Engagement metric prediction  
5. Parent comprehension test  
