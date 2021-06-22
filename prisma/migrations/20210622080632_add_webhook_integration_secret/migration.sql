-- CreateTable
CREATE TABLE "WebHookIntegrationSecret" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "secret" VARCHAR(255) NOT NULL,

    PRIMARY KEY ("id")
);
