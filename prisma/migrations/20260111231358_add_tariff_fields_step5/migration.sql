-- DropIndex
DROP INDEX "tariffAssignments_connectorId_idx";

-- AlterTable
ALTER TABLE "chargingSessions" ADD COLUMN     "tariffPricePerMinute" DOUBLE PRECISION,
ADD COLUMN     "tariffSessionStartFee" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "tariffProfiles" ALTER COLUMN "pricePerMinute" DROP NOT NULL,
ALTER COLUMN "sessionStartFee" DROP NOT NULL;
