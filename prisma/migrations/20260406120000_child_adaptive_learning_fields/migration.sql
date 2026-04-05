-- Adaptive learning: weak areas + score history on students (Child)

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "weak_areas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "adaptive_score_history" JSONB NOT NULL DEFAULT '[]'::jsonb;
