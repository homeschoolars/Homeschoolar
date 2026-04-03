-- CreateEnum
CREATE TYPE "CurriculumPromptType" AS ENUM ('story', 'worksheet', 'quiz');

-- CreateTable
CREATE TABLE "curriculum_age_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "curriculum_age_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "age_group_id" TEXT NOT NULL,
    "base_subject_id" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "curriculum_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_units" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "curriculum_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_lessons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "curriculum_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_contents" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "story_text" TEXT NOT NULL,
    "activity_instructions" TEXT NOT NULL,
    "quiz_concept" TEXT NOT NULL,
    "worksheet_example" TEXT NOT NULL,
    "parent_tip" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "curriculum_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_ai_prompts" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "type" "CurriculumPromptType" NOT NULL,
    "prompt_template" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "curriculum_ai_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_generated_contents" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "type" "CurriculumPromptType" NOT NULL,
    "content" TEXT NOT NULL,
    "prompt_snapshot" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "curriculum_generated_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_age_groups_name_key" ON "curriculum_age_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_subjects_age_group_id_slug_key" ON "curriculum_subjects"("age_group_id", "slug");

-- CreateIndex
CREATE INDEX "curriculum_subjects_base_subject_id_idx" ON "curriculum_subjects"("base_subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_units_subject_id_slug_key" ON "curriculum_units"("subject_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_lessons_unit_id_slug_key" ON "curriculum_lessons"("unit_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_contents_lesson_id_key" ON "curriculum_contents"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_ai_prompts_lesson_id_type_key" ON "curriculum_ai_prompts"("lesson_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_generated_contents_lesson_id_type_key" ON "curriculum_generated_contents"("lesson_id", "type");

-- AddForeignKey
ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_age_group_id_fkey"
FOREIGN KEY ("age_group_id") REFERENCES "curriculum_age_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_base_subject_id_fkey"
FOREIGN KEY ("base_subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_units" ADD CONSTRAINT "curriculum_units_subject_id_fkey"
FOREIGN KEY ("subject_id") REFERENCES "curriculum_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_lessons" ADD CONSTRAINT "curriculum_lessons_unit_id_fkey"
FOREIGN KEY ("unit_id") REFERENCES "curriculum_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_contents" ADD CONSTRAINT "curriculum_contents_lesson_id_fkey"
FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_ai_prompts" ADD CONSTRAINT "curriculum_ai_prompts_lesson_id_fkey"
FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_generated_contents" ADD CONSTRAINT "curriculum_generated_contents_lesson_id_fkey"
FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
