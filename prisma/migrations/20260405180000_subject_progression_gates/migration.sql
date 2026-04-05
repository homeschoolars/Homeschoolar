-- Subject-wide gating: lectures, lesson-linked worksheets, unique generated content per session key

ALTER TABLE "curriculum_lessons" ADD COLUMN IF NOT EXISTS "required_worksheet_count" INTEGER NOT NULL DEFAULT 2;

UPDATE "curriculum_lessons" SET "required_worksheet_count" = 0 WHERE "required_worksheet_count" = 2;

CREATE TABLE IF NOT EXISTS "curriculum_lectures" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "content_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_lectures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "curriculum_lectures_lesson_id_order_index_idx" ON "curriculum_lectures"("lesson_id", "order_index");

ALTER TABLE "curriculum_lectures" ADD CONSTRAINT "curriculum_lectures_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "student_lecture_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "lecture_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_lecture_progress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_lecture_progress_student_id_lecture_id_key" ON "student_lecture_progress"("student_id", "lecture_id");
CREATE INDEX IF NOT EXISTS "student_lecture_progress_student_id_idx" ON "student_lecture_progress"("student_id");

ALTER TABLE "student_lecture_progress" ADD CONSTRAINT "student_lecture_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_lecture_progress" ADD CONSTRAINT "student_lecture_progress_lecture_id_fkey" FOREIGN KEY ("lecture_id") REFERENCES "curriculum_lectures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "student_lesson_worksheet_done" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "worksheet_id" TEXT NOT NULL,
    "submission_id" TEXT,
    "score" DECIMAL(5,2) NOT NULL,
    "max_score" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_lesson_worksheet_done_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_lesson_worksheet_done_student_id_worksheet_id_key" ON "student_lesson_worksheet_done"("student_id", "worksheet_id");
CREATE INDEX IF NOT EXISTS "student_lesson_worksheet_done_student_id_lesson_id_idx" ON "student_lesson_worksheet_done"("student_id", "lesson_id");

ALTER TABLE "student_lesson_worksheet_done" ADD CONSTRAINT "student_lesson_worksheet_done_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_lesson_worksheet_done" ADD CONSTRAINT "student_lesson_worksheet_done_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_lesson_worksheet_done" ADD CONSTRAINT "student_lesson_worksheet_done_worksheet_id_fkey" FOREIGN KEY ("worksheet_id") REFERENCES "worksheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "worksheets" ADD COLUMN IF NOT EXISTS "lesson_id" TEXT;
CREATE INDEX IF NOT EXISTS "worksheets_lesson_id_idx" ON "worksheets"("lesson_id");
ALTER TABLE "worksheets" ADD CONSTRAINT "worksheets_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "curriculum_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "curriculum_generated_contents_lesson_id_type_key";
