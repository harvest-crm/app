-- AlterTable
ALTER TABLE "AiInsight" ADD COLUMN     "ownerClerkUserId" TEXT;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "ownerClerkUserId" TEXT;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "ownerClerkUserId" TEXT;

-- CreateIndex
CREATE INDEX "AiInsight_organizationId_ownerClerkUserId_status_idx" ON "AiInsight"("organizationId", "ownerClerkUserId", "status");

-- CreateIndex
CREATE INDEX "Contact_organizationId_ownerClerkUserId_idx" ON "Contact"("organizationId", "ownerClerkUserId");

-- CreateIndex
CREATE INDEX "Deal_organizationId_ownerClerkUserId_idx" ON "Deal"("organizationId", "ownerClerkUserId");

-- CreateIndex
CREATE INDEX "Task_organizationId_assignedToClerkUserId_idx" ON "Task"("organizationId", "assignedToClerkUserId");
