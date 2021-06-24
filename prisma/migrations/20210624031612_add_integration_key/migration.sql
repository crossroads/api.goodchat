-- CreateTable
CREATE TABLE "IntegrationKey" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" VARCHAR(255) NOT NULL,
    "value" VARCHAR(255) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationKey.type_unique" ON "IntegrationKey"("type");
