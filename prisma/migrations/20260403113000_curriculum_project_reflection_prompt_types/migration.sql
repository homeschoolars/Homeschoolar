-- Add new curriculum prompt types for advanced age groups
ALTER TYPE "CurriculumPromptType" ADD VALUE IF NOT EXISTS 'project';
ALTER TYPE "CurriculumPromptType" ADD VALUE IF NOT EXISTS 'reflection';
