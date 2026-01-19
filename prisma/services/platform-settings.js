/**
 * Platform Settings Service
 * Manages global platform configuration (singleton pattern)
 * 
 * IMPORTANT:
 * - All changes are audited
 * - Settings are versioned (optimistic locking)
 * - No retroactive changes to existing sessions
 */

import prisma from '@/prisma/index';

const SETTINGS_ID = 'platform-settings-singleton'; // Fixed ID for singleton

/**
 * Get current platform settings (singleton)
 * @returns {Promise<object|null>} PlatformSettings or null if not initialized
 */
export async function getPlatformSettings() {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: SETTINGS_ID },
    include: {
      history: {
        take: 10,
        orderBy: { changedAt: 'desc' },
        include: {
          changedBy: {
            select: { id: true, email: true, name: true },
          },
        },
      },
    },
  });

  return settings;
}

/**
 * Initialize platform settings (first time setup)
 * @param {object} initialData - Initial settings data
 * @returns {Promise<object>} Created PlatformSettings
 */
export async function initializePlatformSettings(initialData = {}) {
  // Check if already exists
  const existing = await prisma.platformSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (existing) {
    return existing;
  }

  // Create with defaults
  const defaults = {
    id: SETTINGS_ID,
    stripeMode: 'TEST',
    defaultHoldAmountCents: 5000,
    currency: 'EUR',
    clearingTolerancePercent: 5.0,
    clearingToleranceKwh: 0.5,
    inboundEnabled: true,
    outboundEnabled: true,
    defaultZoom: 10,
    recaptchaEnabled: false,
    recaptchaThreshold: 0.5,
    invoicingProvider: 'NONE',
    enable2FA: false,
    maxLoginAttempts: 5,
    ipBlockThreshold: 10,
    ...initialData,
  };

  return await prisma.platformSettings.create({
    data: defaults,
  });
}

/**
 * Update platform settings with audit trail
 * @param {object} params
 * @param {string} params.changedByUserId - User ID making the change
 * @param {object} params.updates - Settings to update (partial)
 * @param {string} params.reason - Optional reason for change
 * @returns {Promise<object>} Updated PlatformSettings
 * @throws {Error} If version conflict (optimistic locking)
 */
export async function updatePlatformSettings({ changedByUserId, updates, reason = null }) {
  // Get current settings
  const current = await prisma.platformSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  if (!current) {
    // Initialize if not exists
    await initializePlatformSettings();
    return updatePlatformSettings({ changedByUserId, updates, reason });
  }

  // Prepare old values snapshot (exclude sensitive fields for history)
  const oldValues = {
    stripeMode: current.stripeMode,
    defaultHoldAmountCents: current.defaultHoldAmountCents,
    currency: current.currency,
    hubjectEnvironment: current.hubjectEnvironment,
    hubjectOperatorId: current.hubjectOperatorId,
    hubjectEMPId: current.hubjectEMPId,
    clearingTolerancePercent: current.clearingTolerancePercent,
    clearingToleranceKwh: current.clearingToleranceKwh,
    inboundEnabled: current.inboundEnabled,
    outboundEnabled: current.outboundEnabled,
    googleMapsApiKey: current.googleMapsApiKey ? '***MASKED***' : null,
    recaptchaEnabled: current.recaptchaEnabled,
    recaptchaSiteKey: current.recaptchaSiteKey ? '***MASKED***' : null,
    invoicingProvider: current.invoicingProvider,
    enable2FA: current.enable2FA,
    maxLoginAttempts: current.maxLoginAttempts,
    ipBlockThreshold: current.ipBlockThreshold,
    // ... add other non-sensitive fields
  };

  // Prepare new values (mask sensitive fields)
  const newValues = { ...oldValues };
  Object.keys(updates).forEach((key) => {
    if (key.includes('Key') || key.includes('Secret') || key.includes('Token')) {
      newValues[key] = updates[key] ? '***MASKED***' : null;
    } else {
      newValues[key] = updates[key] !== undefined ? updates[key] : oldValues[key];
    }
  });

  // Update with optimistic locking
  try {
    const updated = await prisma.platformSettings.update({
      where: {
        id: SETTINGS_ID,
        version: current.version, // Optimistic locking
      },
      data: {
        ...updates,
        version: { increment: 1 },
      },
    });

    // Create audit history entry
    await prisma.platformSettingsHistory.create({
      data: {
        settingsId: SETTINGS_ID,
        changedByUserId,
        oldValues,
        newValues,
        reason,
      },
    });

    return updated;
  } catch (error) {
    if (error.code === 'P2025') {
      // Record not found or version mismatch
      throw new Error('Settings were modified by another user. Please refresh and try again.');
    }
    throw error;
  }
}

/**
 * Get platform settings history
 * @param {object} params
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.pageSize - Page size (default: 20)
 * @returns {Promise<object>} { data, pagination }
 */
export async function getPlatformSettingsHistory({ page = 1, pageSize = 20 }) {
  const skip = (page - 1) * pageSize;

  const [data, total] = await Promise.all([
    prisma.platformSettingsHistory.findMany({
      skip,
      take: pageSize,
      orderBy: { changedAt: 'desc' },
      include: {
        changedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    }),
    prisma.platformSettingsHistory.count(),
  ]);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get Stripe configuration (with fallback to env vars)
 * @returns {Promise<object>} { secretKey, publishableKey, webhookSecret, mode }
 */
export async function getStripeConfig() {
  let settings = await getPlatformSettings();
  // Backward compatibility: older code created settings without singleton ID
  if (!settings) {
    settings = await prisma.platformSettings.findFirst();
  }

  if (settings?.stripeSecretKey) {
    return {
      secretKey: settings.stripeSecretKey,
      publishableKey: settings.stripePublishableKey,
      webhookSecret: settings.stripeWebhookSecret,
      mode: settings.stripeMode || 'TEST',
      defaultHoldAmountCents: settings.defaultHoldAmountCents || 5000,
      currency: settings.currency || 'EUR',
    };
  }

  // Fallback to environment variables
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    mode: process.env.STRIPE_MODE || 'TEST',
    defaultHoldAmountCents: parseInt(process.env.STRIPE_DEFAULT_HOLD_CENTS || '5000', 10),
    currency: process.env.CURRENCY || 'EUR',
  };
}

/**
 * Get Hubject configuration (with fallback to env vars)
 * @returns {Promise<object>} { environment, operatorId, empId, apiKey, ... }
 */
export async function getHubjectConfig() {
  const settings = await getPlatformSettings();

  if (settings?.hubjectOperatorId) {
    return {
      environment: settings.hubjectEnvironment || 'TEST',
      operatorId: settings.hubjectOperatorId,
      empId: settings.hubjectEMPId,
      apiKey: settings.hubjectApiKey,
      clearingTolerancePercent: settings.clearingTolerancePercent || 5.0,
      clearingToleranceKwh: settings.clearingToleranceKwh || 0.5,
      inboundEnabled: settings.inboundEnabled !== false,
      outboundEnabled: settings.outboundEnabled !== false,
    };
  }

  // Fallback to environment variables
  return {
    environment: process.env.HUBJECT_ENVIRONMENT || 'TEST',
    operatorId: process.env.HUBJECT_OPERATOR_ID || '',
    empId: process.env.HUBJECT_EMP_ID || '',
    apiKey: process.env.HUBJECT_API_KEY || '',
    clearingTolerancePercent: parseFloat(process.env.HUBJECT_CLEARING_TOLERANCE_PERCENT || '5.0'),
    clearingToleranceKwh: parseFloat(process.env.HUBJECT_CLEARING_TOLERANCE_KWH || '0.5'),
    inboundEnabled: process.env.HUBJECT_INBOUND_ENABLED !== 'false',
    outboundEnabled: process.env.HUBJECT_OUTBOUND_ENABLED !== 'false',
  };
}

/**
 * Get Google Services configuration
 * @returns {Promise<object>} { mapsApiKey, recaptchaSiteKey, recaptchaSecretKey, ... }
 */
export async function getGoogleConfig() {
  const settings = await getPlatformSettings();

  if (settings) {
    return {
      mapsApiKey: settings.googleMapsApiKey,
      defaultMapCenter: settings.defaultMapCenter,
      defaultZoom: settings.defaultZoom || 10,
      mapStyle: settings.mapStyle ? JSON.parse(settings.mapStyle) : null,
      recaptchaEnabled: settings.recaptchaEnabled || false,
      recaptchaSiteKey: settings.recaptchaSiteKey,
      recaptchaSecretKey: settings.recaptchaSecretKey,
      recaptchaThreshold: settings.recaptchaThreshold || 0.5,
    };
  }

  // Fallback to environment variables
  return {
    mapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
    defaultMapCenter: process.env.GOOGLE_MAPS_DEFAULT_CENTER || '',
    defaultZoom: parseInt(process.env.GOOGLE_MAPS_DEFAULT_ZOOM || '10', 10),
    mapStyle: process.env.GOOGLE_MAPS_STYLE ? JSON.parse(process.env.GOOGLE_MAPS_STYLE) : null,
    recaptchaEnabled: process.env.RECAPTCHA_ENABLED === 'true',
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
    recaptchaSecretKey: process.env.RECAPTCHA_SECRET_KEY || '',
    recaptchaThreshold: parseFloat(process.env.RECAPTCHA_THRESHOLD || '0.5'),
  };
}
