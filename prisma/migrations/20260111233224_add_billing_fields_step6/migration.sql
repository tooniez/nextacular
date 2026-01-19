-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('NOT_BILLED', 'BILLED', 'BILLING_ERROR');

-- AlterTable
ALTER TABLE "chargingSessions" ADD COLUMN     "billedAt" TIMESTAMP(3),
ADD COLUMN     "billingBreakdownJson" TEXT,
ADD COLUMN     "billingStatus" "BillingStatus" NOT NULL DEFAULT 'NOT_BILLED';
