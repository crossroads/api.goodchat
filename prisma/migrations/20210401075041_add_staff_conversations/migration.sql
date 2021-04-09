-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "private" SET DEFAULT true;

-- CreateTable
CREATE TABLE "StaffConversations" (
    "staffId" INTEGER NOT NULL,
    "conversationId" INTEGER NOT NULL,

    PRIMARY KEY ("staffId","conversationId")
);

-- AddForeignKey
ALTER TABLE "StaffConversations" ADD FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffConversations" ADD FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
