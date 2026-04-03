# Structured Curriculum (Age 8-9)

## Seed Source

- `prisma/curriculum/age-8-9.json`

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
- Computer & Technology
- Islamic Studies

## AI Prompt Strategy (8-9)

- Placeholder: `{{lessonTitle}}`
- Designed for:
  - thinking skills
  - problem solving
  - creativity
- Story prompts require problem + solution and moral.
- Worksheet prompts include writing + critical-thinking task.
- Quiz prompts include reasoning/scenario question.

## Computer & Technology (AI Awareness)

For technology lessons, prompts automatically append:

- AI explanation in child-friendly language with real-life examples
- Human vs AI comparison
- Real-life use cases

## Session-Aware AI Caching

- Table: `curriculum_generated_contents`
- Cache key: `(lesson_id, type, session_key)`
- Endpoint accepts optional `sessionKey` and persists generated output per session.
