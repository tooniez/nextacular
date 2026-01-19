-- CreateEnum
CREATE TYPE "StationStatus" AS ENUM ('AVAILABLE', 'CHARGING', 'UNAVAILABLE', 'FAULTED', 'OFFLINE', 'PREPARING');

-- CreateEnum
CREATE TYPE "ConnectorStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'UNAVAILABLE', 'FAULTED', 'FINISHING', 'RESERVED');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SessionStopReason" AS ENUM ('LOCAL', 'REMOTE', 'EV_DISCONNECTED', 'HARD_RESET', 'SOFT_RESET', 'DE_AUTHORIZED', 'ENERGY_LIMIT_REACHED', 'EMERGENCY_STOP', 'OTHER');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "endUsers" (
    "id" TEXT NOT NULL,
    "endUserCode" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "name" TEXT,
    "rfidToken" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "endUsers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymentProfiles" (
    "id" TEXT NOT NULL,
    "endUserId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paymentProfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chargingStations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "ocppId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "StationStatus" NOT NULL DEFAULT 'AVAILABLE',
    "ocppVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chargingStations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connectors" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "connectorId" INTEGER NOT NULL,
    "name" TEXT,
    "status" "ConnectorStatus" NOT NULL DEFAULT 'AVAILABLE',
    "maxPower" DOUBLE PRECISION,
    "connectorType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariffProfiles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "basePricePerKwh" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "msFeePercent" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariffProfiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariffAssignments" (
    "id" TEXT NOT NULL,
    "tariffId" TEXT NOT NULL,
    "stationId" TEXT,
    "connectorId" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tariffAssignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chargingSessions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "endUserId" TEXT,
    "rfidToken" TEXT,
    "ocppTransactionId" INTEGER,
    "ocppIdTag" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "energyKwh" DOUBLE PRECISION,
    "meterStart" DOUBLE PRECISION,
    "meterStop" DOUBLE PRECISION,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "stopReason" "SessionStopReason",
    "tariffSnapshotId" TEXT,
    "tariffBasePricePerKwh" DOUBLE PRECISION,
    "tariffMsFeePercent" DOUBLE PRECISION,
    "tariffCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "grossAmount" DOUBLE PRECISION,
    "msFeeAmount" DOUBLE PRECISION,
    "subCpoEarningAmount" DOUBLE PRECISION,
    "netAmount" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vatRate" DOUBLE PRECISION DEFAULT 0,
    "vatAmount" DOUBLE PRECISION DEFAULT 0,
    "isVatIncluded" BOOLEAN NOT NULL DEFAULT true,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chargingSessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptionPlans" (
    "id" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyFeePerStation" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptionPlans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizationSubscriptions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "stationId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "activeFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activeUntil" TIMESTAMP(3),
    "monthlyFee" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizationSubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payoutStatements" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalEnergyKwh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGrossAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalMsFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSubCpoEarning" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "payoutAmount" DOUBLE PRECISION,
    "payoutDate" TIMESTAMP(3),
    "payoutReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payoutStatements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payoutLineItems" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sessionStartTime" TIMESTAMP(3) NOT NULL,
    "stationName" TEXT NOT NULL,
    "energyKwh" DOUBLE PRECISION NOT NULL,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "msFeeAmount" DOUBLE PRECISION NOT NULL,
    "subCpoEarning" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payoutLineItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "endUsers_endUserCode_key" ON "endUsers"("endUserCode");

-- CreateIndex
CREATE UNIQUE INDEX "endUsers_email_key" ON "endUsers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "endUsers_rfidToken_key" ON "endUsers"("rfidToken");

-- CreateIndex
CREATE UNIQUE INDEX "paymentProfiles_endUserId_key" ON "paymentProfiles"("endUserId");

-- CreateIndex
CREATE UNIQUE INDEX "paymentProfiles_stripeCustomerId_key" ON "paymentProfiles"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "chargingStations_workspaceId_idx" ON "chargingStations"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "chargingStations_workspaceId_ocppId_key" ON "chargingStations"("workspaceId", "ocppId");

-- CreateIndex
CREATE INDEX "connectors_stationId_idx" ON "connectors"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "connectors_stationId_connectorId_key" ON "connectors"("stationId", "connectorId");

-- CreateIndex
CREATE INDEX "tariffProfiles_workspaceId_idx" ON "tariffProfiles"("workspaceId");

-- CreateIndex
CREATE INDEX "tariffProfiles_workspaceId_isActive_idx" ON "tariffProfiles"("workspaceId", "isActive");

-- CreateIndex
CREATE INDEX "tariffAssignments_tariffId_idx" ON "tariffAssignments"("tariffId");

-- CreateIndex
CREATE INDEX "tariffAssignments_stationId_idx" ON "tariffAssignments"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "chargingSessions_ocppTransactionId_key" ON "chargingSessions"("ocppTransactionId");

-- CreateIndex
CREATE INDEX "chargingSessions_workspaceId_idx" ON "chargingSessions"("workspaceId");

-- CreateIndex
CREATE INDEX "chargingSessions_stationId_idx" ON "chargingSessions"("stationId");

-- CreateIndex
CREATE INDEX "chargingSessions_endUserId_idx" ON "chargingSessions"("endUserId");

-- CreateIndex
CREATE INDEX "chargingSessions_status_idx" ON "chargingSessions"("status");

-- CreateIndex
CREATE INDEX "chargingSessions_startTime_idx" ON "chargingSessions"("startTime");

-- CreateIndex
CREATE INDEX "chargingSessions_paymentStatus_idx" ON "chargingSessions"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "chargingSessions_stationId_ocppTransactionId_key" ON "chargingSessions"("stationId", "ocppTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptionPlans_planCode_key" ON "subscriptionPlans"("planCode");

-- CreateIndex
CREATE INDEX "organizationSubscriptions_workspaceId_idx" ON "organizationSubscriptions"("workspaceId");

-- CreateIndex
CREATE INDEX "organizationSubscriptions_status_idx" ON "organizationSubscriptions"("status");

-- CreateIndex
CREATE INDEX "payoutStatements_workspaceId_idx" ON "payoutStatements"("workspaceId");

-- CreateIndex
CREATE INDEX "payoutStatements_status_idx" ON "payoutStatements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payoutStatements_workspaceId_periodStart_periodEnd_key" ON "payoutStatements"("workspaceId", "periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "payoutLineItems_sessionId_key" ON "payoutLineItems"("sessionId");

-- CreateIndex
CREATE INDEX "payoutLineItems_statementId_idx" ON "payoutLineItems"("statementId");

-- AddForeignKey
ALTER TABLE "paymentProfiles" ADD CONSTRAINT "paymentProfiles_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "endUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargingStations" ADD CONSTRAINT "chargingStations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "chargingStations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariffProfiles" ADD CONSTRAINT "tariffProfiles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariffAssignments" ADD CONSTRAINT "tariffAssignments_tariffId_fkey" FOREIGN KEY ("tariffId") REFERENCES "tariffProfiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariffAssignments" ADD CONSTRAINT "tariffAssignments_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "chargingStations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariffAssignments" ADD CONSTRAINT "tariffAssignments_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargingSessions" ADD CONSTRAINT "chargingSessions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargingSessions" ADD CONSTRAINT "chargingSessions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "chargingStations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargingSessions" ADD CONSTRAINT "chargingSessions_connectorId_fkey" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargingSessions" ADD CONSTRAINT "chargingSessions_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "endUsers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chargingSessions" ADD CONSTRAINT "chargingSessions_tariffSnapshotId_fkey" FOREIGN KEY ("tariffSnapshotId") REFERENCES "tariffProfiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizationSubscriptions" ADD CONSTRAINT "organizationSubscriptions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizationSubscriptions" ADD CONSTRAINT "organizationSubscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscriptionPlans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizationSubscriptions" ADD CONSTRAINT "organizationSubscriptions_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "chargingStations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payoutStatements" ADD CONSTRAINT "payoutStatements_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payoutLineItems" ADD CONSTRAINT "payoutLineItems_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "payoutStatements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payoutLineItems" ADD CONSTRAINT "payoutLineItems_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "chargingSessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
