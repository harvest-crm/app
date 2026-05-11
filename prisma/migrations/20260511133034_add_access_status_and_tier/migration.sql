-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrgTier" AS ENUM ('INTERNAL', 'LIFETIME_FREE', 'BROKERAGE', 'STANDARD');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "accessStatus" "AccessStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "tier" "OrgTier" NOT NULL DEFAULT 'STANDARD';
