-- User/onboarding + guardian fields on profiles (schema had these; DB on production did not).
-- Fixes signup: "The column profiles.onboarding_complete does not exist"

ALTER TABLE "profiles"
  ADD COLUMN "onboarding_complete" BOOLEAN,
  ADD COLUMN "onboarding_phone" TEXT,
  ADD COLUMN "onboarding_country" TEXT,
  ADD COLUMN "onboarding_religion_label" TEXT,
  ADD COLUMN "family_role" TEXT,
  ADD COLUMN "father_status" TEXT,
  ADD COLUMN "guardian_verification_status" TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN "death_certificate_url" TEXT,
  ADD COLUMN "eligible_for_free_education" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "guardian_verification_documents" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "guardian_verification_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "guardian_verification_documents_user_id_key" ON "guardian_verification_documents"("user_id");

ALTER TABLE "guardian_verification_documents"
  ADD CONSTRAINT "guardian_verification_documents_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
