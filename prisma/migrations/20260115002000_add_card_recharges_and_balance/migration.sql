-- Add RFID stored-value balance and card recharge ledger

ALTER TABLE "endUsers"
  ADD COLUMN IF NOT EXISTS "rfidBalanceCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "cardRecharges" (
  "id" TEXT NOT NULL,
  "endUserId" TEXT NOT NULL,
  "cardSerial" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "channel" TEXT NOT NULL DEFAULT 'manual',
  "createdByEmail" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cardRecharges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cardRecharges_cardSerial_idx" ON "cardRecharges"("cardSerial");
CREATE INDEX IF NOT EXISTS "cardRecharges_endUserId_idx" ON "cardRecharges"("endUserId");

ALTER TABLE "cardRecharges"
  ADD CONSTRAINT "cardRecharges_endUserId_fkey"
  FOREIGN KEY ("endUserId") REFERENCES "endUsers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

