/**
 * Create Stripe SetupIntent for driver to save payment method (PCI compliant).
 * POST -> { clientSecret, publishableKey }
 */
import Stripe from 'stripe';
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';
import { getStripeConfig } from '@/prisma/services/platform-settings';

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  const cfg = await getStripeConfig();
  if (!cfg?.secretKey || !cfg?.publishableKey) {
    return res.status(400).json({ errors: { stripe: { msg: 'Stripe non configurato' } } });
  }

  const stripe = new Stripe(cfg.secretKey, { apiVersion: '2023-10-16' });

  try {
    // Ensure customer exists
    let profile = await prisma.paymentProfile.findUnique({
      where: { endUserId: endUser.id },
      select: { stripeCustomerId: true, stripePaymentMethodId: true, status: true },
    });

    let customerId = profile?.stripeCustomerId || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: endUser.email || undefined,
        name: endUser.name || undefined,
        phone: endUser.phone || undefined,
        metadata: { endUserId: endUser.id, source: 'driver_app' },
      });
      customerId = customer.id;

      await prisma.paymentProfile.upsert({
        where: { endUserId: endUser.id },
        create: {
          endUserId: endUser.id,
          stripeCustomerId: customerId,
          stripePaymentMethodId: profile?.stripePaymentMethodId || null,
          status: 'ACTIVE',
        },
        update: {
          stripeCustomerId: customerId,
          status: 'ACTIVE',
        },
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      automatic_payment_methods: { enabled: true },
      metadata: { endUserId: endUser.id, type: 'driver_payment_method' },
    });

    return res.status(200).json({
      data: {
        clientSecret: setupIntent.client_secret,
        publishableKey: cfg.publishableKey,
      },
    });
  } catch (error) {
    console.error('POST /api/driver/stripe/setup-intent error:', error);
    return res.status(500).json({ errors: { error: { msg: error.message || 'Internal server error' } } });
  }
};

export default handler;

