-- Driver app models: consents, favorites, reservations, vouchers, tickets

-- EndUser consents
ALTER TABLE "endUsers"
  ADD COLUMN IF NOT EXISTS "consents" JSONB;

-- Favorites
CREATE TABLE IF NOT EXISTS "favoriteStations" (
  "id" TEXT NOT NULL,
  "endUserId" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "favoriteStations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "favoriteStations_endUserId_stationId_key" ON "favoriteStations"("endUserId","stationId");
CREATE INDEX IF NOT EXISTS "favoriteStations_endUserId_idx" ON "favoriteStations"("endUserId");
CREATE INDEX IF NOT EXISTS "favoriteStations_stationId_idx" ON "favoriteStations"("stationId");

ALTER TABLE "favoriteStations"
  ADD CONSTRAINT "favoriteStations_endUserId_fkey"
  FOREIGN KEY ("endUserId") REFERENCES "endUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favoriteStations"
  ADD CONSTRAINT "favoriteStations_stationId_fkey"
  FOREIGN KEY ("stationId") REFERENCES "chargingStations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reservations
CREATE TABLE IF NOT EXISTS "stationReservations" (
  "id" TEXT NOT NULL,
  "endUserId" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "connectorId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "reservedUntil" TIMESTAMP(3) NOT NULL,
  "feeCents" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stationReservations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "stationReservations_endUserId_status_idx" ON "stationReservations"("endUserId","status");
CREATE INDEX IF NOT EXISTS "stationReservations_stationId_status_idx" ON "stationReservations"("stationId","status");
CREATE INDEX IF NOT EXISTS "stationReservations_reservedUntil_idx" ON "stationReservations"("reservedUntil");

ALTER TABLE "stationReservations"
  ADD CONSTRAINT "stationReservations_endUserId_fkey"
  FOREIGN KEY ("endUserId") REFERENCES "endUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stationReservations"
  ADD CONSTRAINT "stationReservations_stationId_fkey"
  FOREIGN KEY ("stationId") REFERENCES "chargingStations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stationReservations"
  ADD CONSTRAINT "stationReservations_connectorId_fkey"
  FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Vouchers
CREATE TABLE IF NOT EXISTS "vouchers" (
  "code" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vouchers_pkey" PRIMARY KEY ("code")
);

CREATE TABLE IF NOT EXISTS "voucherRedemptions" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "endUserId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "voucherRedemptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "voucherRedemptions_code_endUserId_key" ON "voucherRedemptions"("code","endUserId");
CREATE INDEX IF NOT EXISTS "voucherRedemptions_endUserId_idx" ON "voucherRedemptions"("endUserId");

ALTER TABLE "voucherRedemptions"
  ADD CONSTRAINT "voucherRedemptions_code_fkey"
  FOREIGN KEY ("code") REFERENCES "vouchers"("code") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "voucherRedemptions"
  ADD CONSTRAINT "voucherRedemptions_endUserId_fkey"
  FOREIGN KEY ("endUserId") REFERENCES "endUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Support tickets
CREATE TABLE IF NOT EXISTS "supportTickets" (
  "id" TEXT NOT NULL,
  "endUserId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supportTickets_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "supportTickets_endUserId_idx" ON "supportTickets"("endUserId");
CREATE INDEX IF NOT EXISTS "supportTickets_status_idx" ON "supportTickets"("status");

ALTER TABLE "supportTickets"
  ADD CONSTRAINT "supportTickets_endUserId_fkey"
  FOREIGN KEY ("endUserId") REFERENCES "endUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

