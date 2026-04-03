# Structured Curriculum (Age 12-13)

## Seed Source

- `prisma/curriculum/age-12-13.json`

## Subjects Included

- English
- Mathematics
- Science
- Geography
- History
- Computer & Technology
- Self-Awareness
- Etiquettes & Manners
- Emotional Management
- Health & Well-Being
- Financial Education
- Islamic Studies

## Advanced Prompt Types

- `story`
- `worksheet`
- `quiz`
- `project`
- `research`
- `debate`
- `reflection`

## Learning Design Focus

- Critical thinking
- Problem-solving
- Independent learning
- Project-based activities
- Leadership and ethical decision-making

## Computer & Technology Special Logic

Prompts are automatically enhanced with:

- practical examples (apps, internet, AI tools)
- benefits
- risks
- safety guidelines

## Generation + Caching

- Lesson screen buttons call `/api/curriculum/lessons/[lessonId]/generate`
- Prompt template fetched from DB and hydrated with `{{lessonTitle}}`
- Output cached in DB by `(lesson_id, type, session_key)`
