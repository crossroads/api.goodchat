-- CreateEnum
CREATE TYPE "AuthorType" AS ENUM ('STAFF', 'CUSTOMER');

-- CreateTable
CREATE TABLE "Staff" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalId" VARCHAR(255) NOT NULL,
    "displayName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalId" VARCHAR(255),
    "sunshineUserId" VARCHAR(255) NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT E'en',
    "metadata" JSONB NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sunshineConversationId" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "readByCustomer" BOOLEAN NOT NULL DEFAULT false,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadReceipt" (
    "id" SERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "lastReadMessageId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "authorType" "AuthorType" NOT NULL,
    "authorId" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Staff.externalId_index" ON "Staff"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer.sunshineUserId_unique" ON "Customer"("sunshineUserId");

-- CreateIndex
CREATE INDEX "Customer.externalId_index" ON "Customer"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation.sunshineConversationId_unique" ON "Conversation"("sunshineConversationId");

-- CreateIndex
CREATE INDEX "Conversation.customerId_index" ON "Conversation"("customerId");

-- CreateIndex
CREATE INDEX "Conversation.source_index" ON "Conversation"("source");

-- CreateIndex
CREATE INDEX "Conversation.private_index" ON "Conversation"("private");

-- CreateIndex
CREATE INDEX "ReadReceipt.conversationId_index" ON "ReadReceipt"("conversationId");

-- CreateIndex
CREATE INDEX "ReadReceipt.staffId_index" ON "ReadReceipt"("staffId");

-- CreateIndex
CREATE INDEX "Message.conversationId_index" ON "Message"("conversationId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD FOREIGN KEY ("lastReadMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadReceipt" ADD FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
