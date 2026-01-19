/**
 * Configuration Health API
 * GET: Get health status of all platform services
 */

import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import {
  getPlatformSettings,
  getStripeConfig,
  getHubjectConfig,
  getGoogleConfig,
} from '@/prisma/services/platform-settings';
import Stripe from 'stripe';

const handler = async (req, res) => {
  try {
    // RBAC: Only Super Admin
    await verifySuperAdmin(req, res);

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const health = {
      stripe: { status: 'NOT_CONFIGURED', message: null },
      hubject: { status: 'NOT_CONFIGURED', message: null },
      google: { status: 'NOT_CONFIGURED', message: null },
      invoicing: { status: 'NOT_CONFIGURED', message: null },
      timestamp: new Date(),
    };

    // Check Stripe
    try {
      const stripeConfig = await getStripeConfig();
      if (stripeConfig.secretKey && stripeConfig.publishableKey) {
        // Test Stripe connection
        try {
          const stripe = new Stripe(stripeConfig.secretKey, {
            apiVersion: '2023-10-16',
          });
          await stripe.balance.retrieve();
          health.stripe = {
            status: 'CONFIGURED',
            mode: stripeConfig.mode,
            message: 'Stripe connection OK',
          };
        } catch (error) {
          health.stripe = {
            status: 'ERROR',
            mode: stripeConfig.mode,
            message: `Stripe connection failed: ${error.message}`,
          };
        }
      }
    } catch (error) {
      health.stripe = {
        status: 'ERROR',
        message: `Stripe config error: ${error.message}`,
      };
    }

    // Check Hubject
    try {
      const hubjectConfig = await getHubjectConfig();
      if (hubjectConfig.operatorId && hubjectConfig.apiKey) {
        health.hubject = {
          status: 'CONFIGURED',
          environment: hubjectConfig.environment,
          message: 'Hubject configuration OK',
        };
      }
    } catch (error) {
      health.hubject = {
        status: 'ERROR',
        message: `Hubject config error: ${error.message}`,
      };
    }

    // Check Google
    try {
      const googleConfig = await getGoogleConfig();
      if (googleConfig.mapsApiKey || googleConfig.recaptchaSiteKey) {
        health.google = {
          status: 'CONFIGURED',
          mapsEnabled: !!googleConfig.mapsApiKey,
          recaptchaEnabled: googleConfig.recaptchaEnabled || false,
          message: 'Google services configured',
        };
      }
    } catch (error) {
      health.google = {
        status: 'ERROR',
        message: `Google config error: ${error.message}`,
      };
    }

    // Check Invoicing
    try {
      const settings = await getPlatformSettings();
      if (settings?.invoicingProvider && settings.invoicingProvider !== 'NONE') {
        health.invoicing = {
          status: 'CONFIGURED',
          provider: settings.invoicingProvider,
          message: `Invoicing provider: ${settings.invoicingProvider}`,
        };
      }
    } catch (error) {
      health.invoicing = {
        status: 'ERROR',
        message: `Invoicing config error: ${error.message}`,
      };
    }

    return res.status(200).json({ data: health });
  } catch (error) {
    console.error('[api/admin/ops/health] Error:', error);

    if (error.statusCode === 403) {
      return res.status(403).json({
        errors: { auth: { msg: 'Unauthorized: Super Admin access required' } },
      });
    }

    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
