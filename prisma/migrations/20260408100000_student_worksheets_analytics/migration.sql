-- Link students to curriculum age group row (name matches Prisma AgeGroup enum text, e.g. AGE_8_9).
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "curriculum_age_group_id" TEXT;

CREATE INDEX IF NOT EXISTS "students_curriculum_age_group_id_idx" ON "students"("curriculum_age_group_id");

ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_curriculum_age_group_id_fkey";
ALTER TABLE "students" ADD CONSTRAINT "students_curriculum_age_group_id_fkey"
  FOREIGN KEY ("curriculum_age_group_id") REFERENCES "curriculum_age_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "students" s
SET "curriculum_age_group_id" = c.id
FROM "curriculum_age_groups" c
WHERE c.name = s.age_group::text
  AND s.curriculum_age_group_id IS NULL;

CREATE TABLE IF NOT EXISTS "student_worksheets" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "subject_id" TEXT,
    "topic_id" TEXT,
    "worksheet_id" TEXT NOT NULL,
    "assignment_id" TEXT,
    "answers_json" JSONB NOT NULL DEFAULT '[]',
    "score" DECIMAL(10,2),
    "percentage" DECIMAL(5,2),
    "feedback" TEXT,
    "weak_topics" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_worksheets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "student_worksheets_student_id_idx" ON "student_worksheets"("student_id");
CREATE INDEX IF NOT EXISTS "student_worksheets_topic_id_idx" ON "student_worksheets"("topic_id");
CREATE INDEX IF NOT EXISTS "student_worksheets_worksheet_id_idx" ON "student_worksheets"("worksheet_id");

ALTER TABLE "student_worksheets" DROP CONSTRAINT IF EXISTS "student_worksheets_student_id_fkey";
ALTER TABLE "student_worksheets" ADD CONSTRAINT "student_worksheets_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_worksheets" DROP CONSTRAINT IF EXISTS "student_worksheets_worksheet_id_fkey";
ALTER TABLE "student_worksheets" ADD CONSTRAINT "student_worksheets_worksheet_id_fkey"
  FOREIGN KEY ("worksheet_id") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "student_analytics" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "topic_id" TEXT NOT NULL,
    "avg_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_score" DECIMAL(5,2),
    "weak_flag" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "student_analytics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_analytics_student_id_topic_id_key" ON "student_analytics"("student_id", "topic_id");
CREATE INDEX IF NOT EXISTS "student_analytics_student_id_weak_flag_idx" ON "student_analytics"("student_id", "weak_flag");

ALTER TABLE "student_analytics" DROP CONSTRAINT IF EXISTS "student_analytics_student_id_fkey";
ALTER TABLE "student_analytics" ADD CONSTRAINT "student_analytics_student_id_fkey"
  FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
