-- CreateTable
CREATE TABLE "platformSettings" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "stripeMode" TEXT DEFAULT 'TEST',
    "stripeSecretKey" TEXT,
    "stripePublishableKey" TEXT,
    "stripeWebhookSecret" TEXT,
    "defaultHoldAmountCents" INTEGER DEFAULT 5000,
    "currency" TEXT DEFAULT 'EUR',
    "hubjectEnvironment" TEXT,
    "hubjectOperatorId" TEXT,
    "hubjectEMPId" TEXT,
    "hubjectApiKey" TEXT,
    "clearingTolerancePercent" DOUBLE PRECISION DEFAULT 5.0,
    "clearingToleranceKwh" DOUBLE PRECISION DEFAULT 0.5,
    "inboundEnabled" BOOLEAN DEFAULT true,
    "outboundEnabled" BOOLEAN DEFAULT true,
    "googleMapsApiKey" TEXT,
    "defaultMapCenter" TEXT,
    "defaultZoom" INTEGER DEFAULT 10,
    "mapStyle" TEXT,
    "recaptchaEnabled" BOOLEAN DEFAULT false,
    "recaptchaSiteKey" TEXT,
    "recaptchaSecretKey" TEXT,
    "recaptchaThreshold" DOUBLE PRECISION DEFAULT 0.5,
    "invoicingProvider" TEXT DEFAULT 'NONE',
    "providerApiKey" TEXT,
    "providerEndpoint" TEXT,
    "companyFiscalData" TEXT,
    "invoiceNumberingPolicy" TEXT,
    "vatRates" TEXT,
    "enable2FA" BOOLEAN DEFAULT false,
    "passwordPolicy" TEXT,
    "maxLoginAttempts" INTEGER DEFAULT 5,
    "ipBlockThreshold" INTEGER DEFAULT 10,
    "internalServiceTokens" TEXT,
    "allowedWebhookIPs" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platformSettingsHistories" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "reason" TEXT,

    CONSTRAINT "platformSettingsHistories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platformSettingsHistories_settingsId_idx" ON "platformSettingsHistories"("settingsId");

-- CreateIndex
CREATE INDEX "platformSettingsHistories_changedAt_idx" ON "platformSettingsHistories"("changedAt");

-- CreateIndex
CREATE INDEX "platformSettingsHistories_changedByUserId_idx" ON "platformSettingsHistories"("changedByUserId");

-- AddForeignKey
ALTER TABLE "platformSettingsHistories" ADD CONSTRAINT "platformSettingsHistories_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "platformSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platformSettingsHistories" ADD CONSTRAINT "platformSettingsHistories_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
