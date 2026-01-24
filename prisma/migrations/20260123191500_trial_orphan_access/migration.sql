-- CreateEnum
CREATE TYPE "OrphanStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "OrphanDocumentType" AS ENUM ('death_certificate', 'ngo_letter', 'other');

-- CreateEnum
CREATE TYPE "OrphanVerificationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('trial', 'paid', 'orphan');

-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "trial_used_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "is_orphan" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "orphan_status" "OrphanStatus" NOT NULL DEFAULT 'rejected';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "type" "SubscriptionType" NOT NULL DEFAULT 'paid',
ADD COLUMN     "is_free" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "orphan_verifications" (
    "id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,
    "submitted_by_parent_id" TEXT NOT NULL,
    "documentType" "OrphanDocumentType" NOT NULL,
    "document_url" TEXT NOT NULL,
    "status" "OrphanVerificationStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by_admin_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orphan_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orphan_verifications_child_id_idx" ON "orphan_verifications"("child_id");

-- CreateIndex
CREATE INDEX "orphan_verifications_status_idx" ON "orphan_verifications"("status");

-- AddForeignKey
ALTER TABLE "orphan_verifications" ADD CONSTRAINT "orphan_verifications_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orphan_verifications" ADD CONSTRAINT "orphan_verifications_submitted_by_parent_id_fkey" FOREIGN KEY ("submitted_by_parent_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orphan_verifications" ADD CONSTRAINT "orphan_verifications_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
