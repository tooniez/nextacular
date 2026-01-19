/**
 * Driver wallet topup confirmation (server-side verification with Stripe)
 * POST: { sessionId }
 *
 * Idempotent by sessionId stored in CardRecharge.createdByName = `stripe:<sessionId>`
 */
import prisma from '@/prisma/index';
import Stripe from 'stripe';
import { requireDriver } from '@/lib/server/require-driver';
import { getStripeConfig } from '@/prisma/services/platform-settings';

function log(hypothesisId, message, data) {
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-wallet',
        hypothesisId,
        location: 'api/driver/wallet/topup/confirm.js',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
}

export default async function handler(req, res) {
  const { method } = req;
  if (method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId) {
    return res.status(400).json({ errors: { sessionId: { msg: 'sessionId required' } } });
  }

  const cfg = await getStripeConfig();
  if (!cfg?.secretKey) {
    return res.status(400).json({ errors: { stripe: { msg: 'Stripe non configurato' } } });
  }
  const stripe = new Stripe(cfg.secretKey, { apiVersion: '2023-10-16' });

  // #region agent log
  log('W_CONFIRM_1', 'confirm start', { hasSessionId: Boolean(sessionId) });
  // #endregion

  // Idempotency check
  const marker = `stripe:${sessionId}`;
  const existing = await prisma.cardRecharge.findFirst({
    where: { endUserId: endUser.id, channel: 'stripe', createdByName: marker },
    select: { id: true },
  });
  if (existing) {
    // #region agent log
    log('W_CONFIRM_2', 'already confirmed', { rechargeId: existing.id });
    // #endregion
    return res.status(200).json({ data: { ok: true, alreadyProcessed: true } });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['payment_intent'] });
  const paid = session.payment_status === 'paid';
  const amountTotal = Number(session.amount_total || 0);
  const currency = String(session.currency || 'eur').toUpperCase();
  const metaUserId = String(session.metadata?.endUserId || '');

  // #region agent log
  log('W_CONFIRM_3', 'stripe session retrieved', { paid, amountTotal, currency, metaMatches: metaUserId === endUser.id });
  // #endregion

  if (!paid) {
    return res.status(409).json({ errors: { payment: { msg: 'Pagamento non completato' } } });
  }
  if (currency !== 'EUR') {
    return res.status(400).json({ errors: { payment: { msg: 'Valuta non supportata' } } });
  }
  if (metaUserId && metaUserId !== endUser.id) {
    return res.status(403).json({ errors: { payment: { msg: 'Pagamento non associato a questo utente' } } });
  }
  if (!Number.isFinite(amountTotal) || amountTotal <= 0) {
    return res.status(400).json({ errors: { payment: { msg: 'Importo non valido' } } });
  }

  const amountCents = Math.min(amountTotal, 500 * 100);

  const recharge = await prisma.$transaction(async (tx) => {
    const r = await tx.cardRecharge.create({
      data: {
        endUserId: endUser.id,
        cardSerial: endUser.rfidToken || endUser.email || endUser.id,
        amountCents,
        currency: 'EUR',
        status: 'COMPLETED',
        channel: 'stripe',
        createdByEmail: endUser.email,
        createdByName: marker,
      },
    });
    await tx.endUser.update({
      where: { id: endUser.id },
      data: { rfidBalanceCents: { increment: amountCents } },
    });
    return r;
  });

  // #region agent log
  log('W_CONFIRM_4', 'credit applied', { rechargeId: recharge.id, amountCents });
  // #endregion

  return res.status(200).json({ data: { ok: true, rechargeId: recharge.id, amountEur: amountCents / 100 } });
}

