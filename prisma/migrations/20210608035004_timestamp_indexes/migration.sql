-- CreateIndex
CREATE INDEX "Conversation.createdAt_index" ON "Conversation"("createdAt");

-- CreateIndex
CREATE INDEX "Conversation.updatedAt_index" ON "Conversation"("updatedAt");

-- CreateIndex
CREATE INDEX "Message.createdAt_index" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Message.updatedAt_index" ON "Message"("updatedAt");
