-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('UNSENT', 'SENT', 'DELIVERED', 'FAILED');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "customerDeliveryStatus" "DeliveryStatus" NOT NULL DEFAULT E'UNSENT',
ADD COLUMN     "customerDeliveryError" TEXT;
