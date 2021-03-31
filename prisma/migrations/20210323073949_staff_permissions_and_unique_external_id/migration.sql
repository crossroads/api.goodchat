/*
  Warnings:

  - The migration will add a unique constraint covering the columns `[externalId]` on the table `Staff`. If there are existing duplicate values, the migration will fail.

*/
-- DropIndex
DROP INDEX "Staff.externalId_index";

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "permissions" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Staff.externalId_unique" ON "Staff"("externalId");
