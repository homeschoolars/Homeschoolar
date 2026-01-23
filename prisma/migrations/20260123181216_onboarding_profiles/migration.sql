-- CreateEnum
CREATE TYPE "ParentRelationship" AS ENUM ('father', 'mother', 'guardian', 'other');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other', 'prefer_not_say');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('muslim', 'non_muslim');

-- CreateEnum
CREATE TYPE "AttentionSpan" AS ENUM ('short', 'medium', 'long');

-- CreateEnum
CREATE TYPE "ScreenTolerance" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "LearningStyle" AS ENUM ('visual', 'auditory', 'reading_writing', 'kinesthetic');

-- CreateEnum
CREATE TYPE "LearningMode" AS ENUM ('games', 'stories', 'challenges', 'step_by_step');

-- CreateEnum
CREATE TYPE "InterestSource" AS ENUM ('preset', 'custom');

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "relationship" "ParentRelationship" NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_profiles" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "age_years" INTEGER NOT NULL,
    "gender" "Gender",
    "religion" "Religion" NOT NULL,
    "education_level" TEXT,
    "strengths" TEXT,
    "challenges" TEXT,
    "ai_summary" JSONB,
    "ai_reasoning" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_preferences" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "learning_styles" "LearningStyle"[],
    "attention_span" "AttentionSpan" NOT NULL,
    "screen_tolerance" "ScreenTolerance" NOT NULL,
    "needs_encouragement" BOOLEAN NOT NULL DEFAULT false,
    "learns_better_with" "LearningMode"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_interests" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "source" "InterestSource" NOT NULL DEFAULT 'preset',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "child_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "initial_assessments" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "subject_id" TEXT,
    "raw_responses" JSONB,
    "subject_confidence" JSONB,
    "evaluated_skills" JSONB,
    "ai_reasoning" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "initial_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parents_user_id_key" ON "parents"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "child_profiles_child_id_key" ON "child_profiles"("child_id");

-- CreateIndex
CREATE INDEX "child_profiles_age_years_idx" ON "child_profiles"("age_years");

-- CreateIndex
CREATE INDEX "child_profiles_religion_idx" ON "child_profiles"("religion");

-- CreateIndex
CREATE UNIQUE INDEX "learning_preferences_child_id_key" ON "learning_preferences"("child_id");

-- CreateIndex
CREATE INDEX "child_interests_child_id_idx" ON "child_interests"("child_id");

-- CreateIndex
CREATE INDEX "child_interests_label_idx" ON "child_interests"("label");

-- CreateIndex
CREATE INDEX "initial_assessments_child_id_idx" ON "initial_assessments"("child_id");

-- CreateIndex
CREATE INDEX "students_parent_id_idx" ON "students"("parent_id");

-- CreateIndex
CREATE INDEX "students_age_group_idx" ON "students"("age_group");

-- AddForeignKey
ALTER TABLE "parents" ADD CONSTRAINT "parents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_profiles" ADD CONSTRAINT "child_profiles_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_preferences" ADD CONSTRAINT "learning_preferences_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_interests" ADD CONSTRAINT "child_interests_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initial_assessments" ADD CONSTRAINT "initial_assessments_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "initial_assessments" ADD CONSTRAINT "initial_assessments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
