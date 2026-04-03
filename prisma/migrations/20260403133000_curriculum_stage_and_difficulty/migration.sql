-- Add stage name to age groups and difficulty level to lessons
ALTER TABLE "curriculum_age_groups"
ADD COLUMN "stage_name" TEXT NOT NULL DEFAULT 'Foundation';

ALTER TABLE "curriculum_lessons"
ADD COLUMN "difficulty_level" TEXT NOT NULL DEFAULT 'foundation';
