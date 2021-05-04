/*
  Warnings:

  - The migration will add a unique constraint covering the columns `[staffId,conversationId]` on the table `ReadReceipt`. If there are existing duplicate values, the migration will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ReadReceipt.staffId_conversationId_unique" ON "ReadReceipt"("staffId", "conversationId");
