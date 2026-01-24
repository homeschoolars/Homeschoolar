-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('baseline', 'progress', 'checkpoint');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('pending', 'completed');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('super_admin', 'content_admin', 'support_admin', 'finance_admin');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "assessment_type" "AssessmentType" NOT NULL DEFAULT 'baseline',
ADD COLUMN     "difficulty_level" "Difficulty",
ADD COLUMN     "status" "AssessmentStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "admin_role" "AdminRole";

-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "expected_answer" TEXT NOT NULL,
    "ai_explanation" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "raw_score" INTEGER NOT NULL,
    "normalized_score" INTEGER NOT NULL,
    "strengths" JSONB DEFAULT '[]',
    "weaknesses" JSONB DEFAULT '[]',
    "ai_summary" TEXT,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_memory" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "mastery_level" INTEGER NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidence" JSONB DEFAULT '{}',

    CONSTRAINT "learning_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavioral_memory" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "attention_pattern" TEXT,
    "learning_style" TEXT,
    "motivation_triggers" JSONB DEFAULT '{}',
    "frustration_signals" JSONB DEFAULT '{}',
    "last_observed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "behavioral_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_questions_assessment_id_idx" ON "assessment_questions"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_results_assessment_id_key" ON "assessment_results"("assessment_id");

-- CreateIndex
CREATE INDEX "learning_memory_child_id_subject_id_idx" ON "learning_memory"("child_id", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_memory_child_id_subject_id_concept_key" ON "learning_memory"("child_id", "subject_id", "concept");

-- CreateIndex
CREATE UNIQUE INDEX "behavioral_memory_child_id_key" ON "behavioral_memory"("child_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_admin_id_idx" ON "admin_audit_logs"("admin_id");

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_memory" ADD CONSTRAINT "learning_memory_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_memory" ADD CONSTRAINT "learning_memory_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavioral_memory" ADD CONSTRAINT "behavioral_memory_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
