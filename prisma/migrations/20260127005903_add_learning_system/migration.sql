-- CreateEnum
CREATE TYPE "AgeBand" AS ENUM ('4-7', '8-13');

-- CreateEnum
CREATE TYPE "ConductedBy" AS ENUM ('parent', 'student');

-- AlterTable
ALTER TABLE "assessments" ADD COLUMN     "conducted_by" "ConductedBy",
ADD COLUMN     "raw_answers" JSONB;

-- CreateTable
CREATE TABLE "student_learning_profiles" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_level_by_subject" JSONB NOT NULL,
    "learning_speed" TEXT NOT NULL,
    "attention_span" TEXT NOT NULL,
    "interest_signals" JSONB NOT NULL,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "gaps" JSONB NOT NULL DEFAULT '[]',
    "recommended_content_style" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_learning_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_roadmaps" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "roadmap_json" JSONB NOT NULL,
    "generated_by" TEXT NOT NULL DEFAULT 'gemini',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_lectures" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "age_band" "AgeBand" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "video_url" TEXT NOT NULL,
    "duration" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_lectures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_quizzes" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "age_band" "AgeBand" NOT NULL,
    "questions" JSONB NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_news" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "age_band" "AgeBand" NOT NULL,
    "generated_by" TEXT NOT NULL DEFAULT 'gemini',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_news_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_learning_profiles_student_id_key" ON "student_learning_profiles"("student_id");

-- CreateIndex
CREATE INDEX "learning_roadmaps_student_id_idx" ON "learning_roadmaps"("student_id");

-- CreateIndex
CREATE INDEX "video_lectures_age_band_idx" ON "video_lectures"("age_band");

-- CreateIndex
CREATE INDEX "video_lectures_subject_idx" ON "video_lectures"("subject");

-- CreateIndex
CREATE INDEX "admin_quizzes_age_band_idx" ON "admin_quizzes"("age_band");

-- CreateIndex
CREATE INDEX "admin_quizzes_subject_idx" ON "admin_quizzes"("subject");

-- CreateIndex
CREATE INDEX "child_news_age_band_idx" ON "child_news"("age_band");

-- CreateIndex
CREATE INDEX "child_news_expires_at_idx" ON "child_news"("expires_at");

-- CreateIndex
CREATE INDEX "child_news_generated_at_idx" ON "child_news"("generated_at");

-- AddForeignKey
ALTER TABLE "student_learning_profiles" ADD CONSTRAINT "student_learning_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_roadmaps" ADD CONSTRAINT "learning_roadmaps_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_lectures" ADD CONSTRAINT "video_lectures_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
