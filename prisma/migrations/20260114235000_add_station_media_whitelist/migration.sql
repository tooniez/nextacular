-- Add station media + whitelist storage columns
ALTER TABLE "chargingStations"
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "photoUrls" JSONB,
  ADD COLUMN IF NOT EXISTS "rfidWhitelist" JSONB;

