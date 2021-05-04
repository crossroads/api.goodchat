/*
  Warnings:

  - You are about to drop the column `staffId` on the `ReadReceipt` table. All the data in the column will be lost.
  - The migration will add a unique constraint covering the columns `[userId,userType,conversationId]` on the table `ReadReceipt`. If there are existing duplicate values, the migration will fail.
  - Added the required column `userId` to the `ReadReceipt` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userType` to the `ReadReceipt` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ReadReceipt" DROP CONSTRAINT "ReadReceipt_staffId_fkey";

-- DropIndex
DROP INDEX "ReadReceipt.staffId_index";

-- DropIndex
DROP INDEX "ReadReceipt.staffId_conversationId_unique";

-- AlterTable
ALTER TABLE "ReadReceipt" DROP COLUMN "staffId",
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD COLUMN     "userType" "AuthorType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ReadReceipt.userId_userType_conversationId_unique" ON "ReadReceipt"("userId", "userType", "conversationId");

-- CreateIndex
CREATE INDEX "ReadReceipt.userType_userId_index" ON "ReadReceipt"("userType", "userId");
