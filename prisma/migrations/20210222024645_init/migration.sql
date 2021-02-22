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
    "externalId" VARCHAR(255) NOT NULL,
    "sunshineUserId" VARCHAR(255) NOT NULL,
    "displayName" TEXT NOT NULL,
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
    "metadata" JSONB NOT NULL,

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
CREATE UNIQUE INDEX "Conversation.sunshineConversationId_unique" ON "Conversation"("sunshineConversationId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
