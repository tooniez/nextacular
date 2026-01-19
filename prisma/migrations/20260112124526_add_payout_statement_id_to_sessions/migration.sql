-- AlterEnum
ALTER TYPE "PayoutStatus" ADD VALUE 'ISSUED';

-- AlterTable
ALTER TABLE "chargingSessions" ADD COLUMN     "payoutStatementId" TEXT;

-- CreateIndex
CREATE INDEX "chargingSessions_payoutStatementId_idx" ON "chargingSessions"("payoutStatementId");

-- CreateIndex
CREATE INDEX "chargingSessions_workspaceId_billingStatus_billedAt_idx" ON "chargingSessions"("workspaceId", "billingStatus", "billedAt");
