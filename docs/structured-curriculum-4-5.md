# Structured Curriculum (Age 4-5)

## Database Entities

- `curriculum_age_groups`
- `curriculum_subjects`
- `curriculum_units`
- `curriculum_lessons`
- `curriculum_contents`
- `curriculum_ai_prompts`
- `curriculum_generated_contents` (AI cache)

## Seed Source

- `prisma/curriculum/age-4-5.json`

## API Endpoints

- `GET /api/curriculum?ageGroup=4-5`
- `GET /api/curriculum?ageGroup=4-5&subject=<subject-id-or-slug>`
- `GET /api/curriculum?unit=<unit-id-or-slug>`
- `GET /api/curriculum?lesson=<lesson-id-or-slug>`
- `GET /api/curriculum/age-groups`
- `GET /api/curriculum/age-groups/4-5`
- `GET /api/curriculum/subjects/<subjectId>?ageGroup=4-5`
- `GET /api/curriculum/units/<unitId>`
- `GET /api/curriculum/lessons/<lessonId>`
- `POST /api/curriculum/lessons/<lessonId>/generate` with body `{ "type": "story" | "worksheet" | "quiz" }`

## AI Prompt Templates

Stored per lesson in `curriculum_ai_prompts` with reusable placeholder `[Lesson Title]`.

## Caching

Generated Story/Worksheet/Quiz content is persisted in `curriculum_generated_contents` per `(lesson_id, type)` to avoid repeated model calls.
