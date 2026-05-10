-- AlterTable
ALTER TABLE "AiInsight" ADD COLUMN     "dismissedAt" TIMESTAMP(3),
ADD COLUMN     "manuallyEdited" BOOLEAN NOT NULL DEFAULT false;
