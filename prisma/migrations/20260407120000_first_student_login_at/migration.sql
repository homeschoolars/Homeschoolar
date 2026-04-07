-- AlterTable
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "first_student_login_at" TIMESTAMP(3);

-- Existing rows: approximate first sign-in so parents are not blocked before new tracking existed.
UPDATE "students"
SET "first_student_login_at" = "created_at"
WHERE "first_student_login_at" IS NULL;
