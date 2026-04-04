-- Extend generated content for parent-controlled shared visibility
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GeneratedContentVisibility') THEN
    CREATE TYPE "GeneratedContentVisibility" AS ENUM ('private', 'shared');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GeneratedContentSource') THEN
    CREATE TYPE "GeneratedContentSource" AS ENUM ('parent', 'system');
  END IF;
END $$;

ALTER TABLE "curriculum_generated_contents"
ADD COLUMN IF NOT EXISTS "unit_id" TEXT,
ADD COLUMN IF NOT EXISTS "student_id" TEXT,
ADD COLUMN IF NOT EXISTS "visibility" "GeneratedContentVisibility" NOT NULL DEFAULT 'private',
ADD COLUMN IF NOT EXISTS "generated_by" "GeneratedContentSource" NOT NULL DEFAULT 'system';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'curriculum_generated_contents_unit_id_fkey'
  ) THEN
    ALTER TABLE "curriculum_generated_contents"
      ADD CONSTRAINT "curriculum_generated_contents_unit_id_fkey"
      FOREIGN KEY ("unit_id") REFERENCES "curriculum_units"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'curriculum_generated_contents_student_id_fkey'
  ) THEN
    ALTER TABLE "curriculum_generated_contents"
      ADD CONSTRAINT "curriculum_generated_contents_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "students"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Subject-level exam table
CREATE TABLE IF NOT EXISTS "subject_exams" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "exam_json" JSONB NOT NULL,
  "score" DECIMAL(5,2),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subject_exams_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "subject_exams_student_id_subject_id_idx"
  ON "subject_exams"("student_id", "subject_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subject_exams_student_id_fkey'
  ) THEN
    ALTER TABLE "subject_exams"
      ADD CONSTRAINT "subject_exams_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "students"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subject_exams_subject_id_fkey'
  ) THEN
    ALTER TABLE "subject_exams"
      ADD CONSTRAINT "subject_exams_subject_id_fkey"
      FOREIGN KEY ("subject_id") REFERENCES "subjects"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
