-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('PRIVATE', 'PUBLIC', 'CUSTOMER');

-- DropIndex
DROP INDEX "Conversation.private_index";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN  "type" "ConversationType";

-- CreateIndex
CREATE INDEX "Conversation.type_index" ON "Conversation"("type");

UPDATE "Conversation" SET type = 'CUSTOMER'; -- default

UPDATE "Conversation"
SET type = 'PUBLIC'
WHERE "customerId" IS NULL AND private = false;

UPDATE "Conversation"
SET type = 'PRIVATE'
WHERE "customerId" IS NULL AND private = true;

ALTER TABLE "Conversation" ALTER COLUMN "type" SET NOT NULL;

ALTER TABLE "Conversation" DROP COLUMN "private";
