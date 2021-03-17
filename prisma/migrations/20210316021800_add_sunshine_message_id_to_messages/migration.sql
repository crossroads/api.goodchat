/*
  Warnings:

  - The migration will add a unique constraint covering the columns `[sunshineMessageId]` on the table `Message`. If there are existing duplicate values, the migration will fail.
  - Added the required column `sunshineMessageId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "sunshineMessageId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Message.sunshineMessageId_unique" ON "Message"("sunshineMessageId");
