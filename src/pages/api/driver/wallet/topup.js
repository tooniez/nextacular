/**
 * Driver wallet topup (Stripe Checkout)
 * POST: { amountEur }
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';
import Stripe from 'stripe';
import { getStripeConfig } from '@/prisma/services/platform-settings';

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  const { amountEur } = req.body || {};
  const eur = Number(amountEur);
  if (!Number.isFinite(eur) || eur <= 0) {
    return res.status(400).json({ errors: { amountEur: { msg: 'Importo non valido' } } });
  }
  const amountCents = Math.round(Math.min(eur, 500) * 100);

  const cfg = await getStripeConfig();
  if (!cfg?.secretKey) {
    return res.status(400).json({ errors: { stripe: { msg: 'Stripe non configurato' } } });
  }

  const stripe = new Stripe(cfg.secretKey, { apiVersion: '2023-10-16' });

  const xfProto = String(req.headers?.['x-forwarded-proto'] || '');
  const proto = xfProto.toLowerCase().includes('https') ? 'https' : 'http';
  const host = String(req.headers?.host || 'localhost');
  const baseUrl = `${proto}://${host}`;

  // Ensure Stripe customer exists
  let profile = await prisma.paymentProfile.findUnique({
    where: { endUserId: endUser.id },
    select: { stripeCustomerId: true, status: true },
  });
  let customerId = profile?.stripeCustomerId || null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: endUser.email || undefined,
      name: endUser.name || undefined,
      phone: endUser.phone || undefined,
      metadata: { endUserId: endUser.id, source: 'driver_wallet' },
    });
    customerId = customer.id;
    await prisma.paymentProfile.upsert({
      where: { endUserId: endUser.id },
      create: {
        endUserId: endUser.id,
        stripeCustomerId: customerId,
        stripePaymentMethodId: null,
        status: 'ACTIVE',
      },
      update: {
        stripeCustomerId: customerId,
        status: 'ACTIVE',
      },
    });
  }

  // #region agent log
  fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'driver-wallet',
      hypothesisId: 'W_TOPUP_1',
      location: 'api/driver/wallet/topup.js',
      message: 'create checkout session',
      data: { amountCents, proto, hasCustomer: Boolean(customerId) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: { name: 'Ricarica Wallet' },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/driver/wallet?topup=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/driver/wallet?topup=cancelled`,
    metadata: {
      endUserId: endUser.id,
      type: 'wallet_topup',
      amountCents: String(amountCents),
    },
  });

  return res.status(200).json({
    data: {
      checkoutUrl: session.url || null,
      sessionId: session.id,
      amountEur: amountCents / 100,
    },
  });
};

export default handler;

