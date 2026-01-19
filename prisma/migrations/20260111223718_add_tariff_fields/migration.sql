-- AlterTable
ALTER TABLE "chargingSessions" ADD COLUMN     "tariffSnapshotJson" TEXT;

-- AlterTable
ALTER TABLE "chargingStations" ADD COLUMN     "firmwareVersion" TEXT,
ADD COLUMN     "lastHeartbeat" TIMESTAMP(3),
ADD COLUMN     "model" TEXT,
ADD COLUMN     "vendor" TEXT;

-- AlterTable
ALTER TABLE "tariffProfiles" ADD COLUMN     "pricePerMinute" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "sessionStartFee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ocppMessages" (
    "id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "messageId" TEXT,
    "chargePointIdentity" TEXT,
    "payload" TEXT NOT NULL,
    "stationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ocppMessages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ocppMessages_stationId_idx" ON "ocppMessages"("stationId");

-- CreateIndex
CREATE INDEX "ocppMessages_direction_idx" ON "ocppMessages"("direction");

-- CreateIndex
CREATE INDEX "ocppMessages_action_idx" ON "ocppMessages"("action");

-- CreateIndex
CREATE INDEX "ocppMessages_chargePointIdentity_idx" ON "ocppMessages"("chargePointIdentity");

-- CreateIndex
CREATE INDEX "ocppMessages_createdAt_idx" ON "ocppMessages"("createdAt");

-- CreateIndex
CREATE INDEX "tariffAssignments_connectorId_idx" ON "tariffAssignments"("connectorId");

-- AddForeignKey
ALTER TABLE "ocppMessages" ADD CONSTRAINT "ocppMessages_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "chargingStations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
