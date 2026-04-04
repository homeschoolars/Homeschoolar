-- Add curriculum age metadata
ALTER TABLE "curriculum_age_groups"
ADD COLUMN IF NOT EXISTS "age_min" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN IF NOT EXISTS "age_max" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS "order_index" INTEGER NOT NULL DEFAULT 0;

-- Subject category and order index
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CurriculumSubjectCategory') THEN
    CREATE TYPE "CurriculumSubjectCategory" AS ENUM ('CORE', 'FUTURE', 'CREATIVE', 'LIFE');
  END IF;
END $$;

ALTER TABLE "curriculum_subjects"
ADD COLUMN IF NOT EXISTS "category" "CurriculumSubjectCategory" NOT NULL DEFAULT 'CORE',
ADD COLUMN IF NOT EXISTS "order_index" INTEGER NOT NULL DEFAULT 0;

-- Unit/Lesson order index fields
ALTER TABLE "curriculum_units"
ADD COLUMN IF NOT EXISTS "order_index" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "curriculum_lessons"
ADD COLUMN IF NOT EXISTS "order_index" INTEGER NOT NULL DEFAULT 0;

-- Generated content JSON + uniqueness
ALTER TABLE "curriculum_generated_contents"
ADD COLUMN IF NOT EXISTS "content_json" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'curriculum_generated_contents_lesson_id_type_key'
  ) THEN
    CREATE UNIQUE INDEX "curriculum_generated_contents_lesson_id_type_key"
      ON "curriculum_generated_contents"("lesson_id", "type");
  END IF;
END $$;

-- Progression model
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LessonStatus') THEN
    CREATE TYPE "LessonStatus" AS ENUM ('locked', 'unlocked', 'completed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "student_lesson_progress" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "lesson_id" TEXT NOT NULL,
  "status" "LessonStatus" NOT NULL DEFAULT 'locked',
  "quiz_passed" BOOLEAN NOT NULL DEFAULT false,
  "completed_at" TIMESTAMP(3),
  "last_accessed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "student_lesson_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_lesson_progress_student_id_lesson_id_key"
  ON "student_lesson_progress"("student_id", "lesson_id");

CREATE INDEX IF NOT EXISTS "student_lesson_progress_student_id_status_idx"
  ON "student_lesson_progress"("student_id", "status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'student_lesson_progress_student_id_fkey'
  ) THEN
    ALTER TABLE "student_lesson_progress"
      ADD CONSTRAINT "student_lesson_progress_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "students"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'student_lesson_progress_lesson_id_fkey'
  ) THEN
    ALTER TABLE "student_lesson_progress"
      ADD CONSTRAINT "student_lesson_progress_lesson_id_fkey"
      FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
