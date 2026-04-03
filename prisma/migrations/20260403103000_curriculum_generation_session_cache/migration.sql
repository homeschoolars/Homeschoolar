-- Add per-session cache key for curriculum generated content
ALTER TABLE "curriculum_generated_contents"
ADD COLUMN "session_key" TEXT NOT NULL DEFAULT 'global';

DROP INDEX IF EXISTS "curriculum_generated_contents_lesson_id_type_key";

CREATE UNIQUE INDEX "curriculum_generated_contents_lesson_id_type_session_key_key"
ON "curriculum_generated_contents"("lesson_id", "type", "session_key");
