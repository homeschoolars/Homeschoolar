-- AI holistic assessment + curriculum resources

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "ai_assessment_difficulty_tier" INTEGER;

ALTER TABLE "assessment_reports" ADD COLUMN IF NOT EXISTS "assessment_kind" TEXT NOT NULL DEFAULT 'parent_question_bank';
ALTER TABLE "assessment_reports" ADD COLUMN IF NOT EXISTS "holistic_quiz_data" JSONB;
ALTER TABLE "assessment_reports" ADD COLUMN IF NOT EXISTS "holistic_answers" JSONB;
ALTER TABLE "assessment_reports" ADD COLUMN IF NOT EXISTS "difficulty_tier" INTEGER;
ALTER TABLE "assessment_reports" ADD COLUMN IF NOT EXISTS "iq_estimate_score" INTEGER;
ALTER TABLE "assessment_reports" ADD COLUMN IF NOT EXISTS "eq_estimate_score" INTEGER;

CREATE TABLE IF NOT EXISTS "assessment_sessions" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "quiz_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "assessment_sessions_child_id_idx" ON "assessment_sessions"("child_id");
CREATE INDEX IF NOT EXISTS "assessment_sessions_child_id_status_idx" ON "assessment_sessions"("child_id", "status");

ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "curriculum_resources" (
    "id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "curriculum_resources_age_subject_topic_idx" ON "curriculum_resources"("age", "subject", "topic");
