-- CreateEnum
CREATE TYPE "LifecycleStage" AS ENUM ('LEAD', 'WORKING', 'ACTIVE_BUYER', 'ACTIVE_SELLER', 'PAST_CLIENT', 'SPHERE', 'INACTIVE', 'TRASH');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('RE_ENGAGEMENT', 'ANNIVERSARY', 'REPLY_RECEIVED', 'NEW_LISTING_MATCH', 'PRICE_DROP_ALERT', 'STALE_DEAL', 'CLOSING_TODAY', 'PREAPPROVAL_EXPIRING');

-- CreateEnum
CREATE TYPE "InsightPriority" AS ENUM ('HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'EXPIRED', 'EDITED');

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "city" TEXT,
ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "lifecycleStage" "LifecycleStage" NOT NULL DEFAULT 'LEAD',
ADD COLUMN     "lifecycleStageEnteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "lifetimeVolumeCents" BIGINT,
ADD COLUMN     "pipelineEnteredAt" TIMESTAMP(3),
ADD COLUMN     "state" TEXT;

-- CreateTable
CREATE TABLE "BuyerProfile" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "priceMinCents" BIGINT,
    "priceMaxCents" BIGINT,
    "bedroomsMin" INTEGER,
    "bathroomsMin" DECIMAL(3,1),
    "neighborhoods" TEXT[],
    "notes" TEXT,
    "preApproved" BOOLEAN NOT NULL DEFAULT false,
    "preApprovalLender" TEXT,
    "preApprovalAmountCents" BIGINT,
    "preApprovalCreditScore" INTEGER,
    "preApprovalNotes" TEXT,
    "preApprovalExpiresAt" TIMESTAMP(3),
    "timelineLabel" TEXT,
    "currentHomeClosingDate" DATE,
    "currentHomeNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInsight" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "priority" "InsightPriority" NOT NULL DEFAULT 'NORMAL',
    "reason" TEXT NOT NULL,
    "suggestedMessage" TEXT NOT NULL,
    "status" "InsightStatus" NOT NULL DEFAULT 'PENDING',
    "actedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BuyerProfile_contactId_key" ON "BuyerProfile"("contactId");

-- CreateIndex
CREATE INDEX "BuyerProfile_organizationId_idx" ON "BuyerProfile"("organizationId");

-- CreateIndex
CREATE INDEX "AiInsight_organizationId_status_priority_idx" ON "AiInsight"("organizationId", "status", "priority");

-- CreateIndex
CREATE INDEX "AiInsight_contactId_status_idx" ON "AiInsight"("contactId", "status");

-- CreateIndex
CREATE INDEX "Contact_organizationId_lifecycleStage_idx" ON "Contact"("organizationId", "lifecycleStage");

-- CreateIndex
CREATE INDEX "Contact_organizationId_lastContactAt_idx" ON "Contact"("organizationId", "lastContactAt");

-- AddForeignKey
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInsight" ADD CONSTRAINT "AiInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
