-- Add advanced prompt types for age 12-13 curriculum
ALTER TYPE "CurriculumPromptType" ADD VALUE IF NOT EXISTS 'debate';
ALTER TYPE "CurriculumPromptType" ADD VALUE IF NOT EXISTS 'research';
