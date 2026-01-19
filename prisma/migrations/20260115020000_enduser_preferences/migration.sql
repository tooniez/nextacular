-- EndUser preferences (driver app)
ALTER TABLE "endUsers"
  ADD COLUMN IF NOT EXISTS "preferences" JSONB;

