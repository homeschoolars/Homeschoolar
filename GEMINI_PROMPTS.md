# Gemini Prompts Documentation

This document describes the Gemini AI prompts used in the Homeschoolars platform.

## 1. Learning Roadmap Generation

**Service:** `services/roadmap-service.ts`

**System Role:**
Expert curriculum designer and child psychologist.

**Input Structure:**
```json
{
  "student_profile": {
    "academic_level_by_subject": {...},
    "learning_speed": "slow | normal | fast",
    "attention_span": "low | medium | high",
    "interest_signals": [...],
    "strengths": [...],
    "gaps": [...],
    "age_band": "4-7 | 8-13",
    "religion": "muslim | non_muslim",
    "preferred_content_style": "story | visual | logic | mix"
  },
  "subject_list": [...subjects...]
}
```

**Output Format:**
```json
{
  "Language & Communication Arts": {
    "entry_level": "Foundation | Bridge | Advanced",
    "weekly_lessons": 3-7,
    "teaching_style": "story | visual | logic | mix",
    "difficulty_progression": "linear | adaptive | intensive",
    "ai_adaptation_strategy": "...",
    "estimated_mastery_weeks": number
  },
  "Electives": {
    "Computational Thinking": {...},
    "Robotics & Applied Technology": {...}
  }
}
```

**Rules:**
- Generate roadmap for each subject in subject_list
- Suggest electives only if age_band = 8-13
- Adapt teaching style based on preferred_content_style
- Reduce cognitive load on weak areas
- Emphasize subjects aligned with interest_signals
- Always generate strict JSON, no free text

---

## 2. Child-Friendly News Panel

**Service:** `services/news-service.ts`

**System Role:**
Child-safe news editor for children aged 4-13.

**Input Structure:**
```json
{
  "age_band": "4-7 | 8-13",
  "topics": ["science", "technology", "education", "environment", "culture"]
}
```

**Output Format:**
```json
[
  {
    "title": "...",
    "summary": "...",
    "category": "...",
    "age_band": "4-7 | 8-13",
    "generated_at": "YYYY-MM-DDTHH:mm:ssZ",
    "expires_at": "YYYY-MM-DDTHH:mm:ssZ"
  }
]
```

**Rules:**
- Generate 3-5 news items
- Each item: Title, 3-5 sentence summary, Category
- Avoid politics, violence, fear, adult content
- Use positive, engaging, explanatory tone
- For age 4-7: simplify language, very short sentences
- For age 8-13: slightly longer sentences, simple structure
- Always generate expires_at 6 hours after generated_at
- Use topic variety for daily feed

---

## 3. Blog Content Generation (Optional)

**Service:** `services/blog-content-service.ts`

**System Role:**
AI content writer specialized in parenting, child psychology, learning science, and AI in education.

**Input Structure:**
```json
{
  "topic": "...",
  "category": "Parenting | Child Psychology | Learning Science | AI in Education | Product Updates",
  "word_count": 600-800,
  "tone": "professional, trustworthy, parent-friendly",
  "seo_keywords": ["..."]
}
```

**Output Format:**
```json
{
  "title": "...",
  "subtitle": "...",
  "content_markdown": "...",
  "seo_meta": {
    "meta_title": "...",
    "meta_description": "...",
    "keywords": ["..."]
  }
}
```

**Rules:**
- Generate blog content in Markdown format
- Include: Title, Subtitle, Table of contents, Paragraphs with headings, Lists/bullets
- Ensure professional and parent-trust tone
- Include summary paragraph at the end
- Highlight key phrases for SEO
- Content must be readable, authoritative, and parent-focused
- Admin can review and publish

---

## Implementation Notes

- All prompts use `gemini-2.0-flash` model
- All outputs are validated using Zod schemas
- Roadmap generation requires subscription access
- News generation runs automatically every 6 hours via cron
- Blog content generation is optional and requires admin access
