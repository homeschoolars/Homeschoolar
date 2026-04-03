# Structured Curriculum (Age 6-7)

## Seed Source

- `prisma/curriculum/age-6-7.json`

## Subjects Included

- English
- Mathematics
- Science
- Social Studies
- Self-Awareness
- Etiquettes
- Emotional Management
- Health
- Financial Education
- Islamic Studies

## AI Prompt Strategy (6-7)

- Placeholder: `{{lessonTitle}}`
- Slightly higher complexity than 4-5:
  - short paragraph reading
  - basic logic and scenario questions
  - simple problem-solving

## API Surface

- Fetch:
  - `GET /api/curriculum?ageGroup=6-7`
  - `GET /api/curriculum?ageGroup=6-7&subject=<id-or-slug>`
  - `GET /api/curriculum?unit=<id-or-slug>`
  - `GET /api/curriculum?lesson=<id-or-slug>`
- CRUD:
  - `GET/POST /api/curriculum/subjects`
  - `GET/PATCH/DELETE /api/curriculum/subjects/[subjectId]`
  - `GET/POST /api/curriculum/units`
  - `GET/PATCH/DELETE /api/curriculum/units/[unitId]`
  - `GET/POST /api/curriculum/lessons`
  - `GET/PATCH/DELETE /api/curriculum/lessons/[lessonId]`
- AI generation with caching:
  - `POST /api/curriculum/lessons/[lessonId]/generate`

## Admin UI

- Route: `GET /admin/curriculum`
- Features:
  - Age-group aware subject/unit/lesson CRUD
  - Lesson content editor (story/activity/quiz concept/worksheet example/parent tip)
  - AI prompt template editor (story/worksheet/quiz)
