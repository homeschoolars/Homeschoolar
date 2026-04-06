-- Holistic learning assessment reports (AI narrative + scores)

CREATE TABLE IF NOT EXISTS "assessment_reports" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "scores" JSONB NOT NULL,
    "open_answers" JSONB NOT NULL,
    "report" JSONB NOT NULL,
    "learner_type" TEXT NOT NULL,
    "interest_profile" TEXT NOT NULL,
    "aptitude_profile" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "assessment_reports_child_id_idx" ON "assessment_reports"("child_id");

ALTER TABLE "assessment_reports" ADD CONSTRAINT "assessment_reports_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
