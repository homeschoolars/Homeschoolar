/*
  Warnings:

  - You are about to drop the column `document_type` on the `orphan_verifications` table. All the data in the column will be lost.
  - Added the required column `documentType` to the `orphan_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orphan_verifications" DROP COLUMN IF EXISTS "document_type";
ALTER TABLE "orphan_verifications"
  ADD COLUMN IF NOT EXISTS "documentType" "OrphanDocumentType" NOT NULL;
