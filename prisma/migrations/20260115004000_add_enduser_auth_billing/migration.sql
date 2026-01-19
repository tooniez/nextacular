-- EndUser auth + billing profile

ALTER TABLE "endUsers"
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "billingProfile" JSONB;

