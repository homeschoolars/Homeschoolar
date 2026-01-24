/*
  Warnings:

  - You are about to drop the column `document_type` on the `orphan_verifications` table. All the data in the column will be lost.
  - Added the required column `documentType` to the `orphan_verifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "orphan_verifications" DROP COLUMN "document_type",
ADD COLUMN     "documentType" "OrphanDocumentType" NOT NULL;
