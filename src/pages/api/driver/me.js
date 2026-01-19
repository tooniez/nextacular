/**
 * Driver session info
 * GET: returns EndUser profile
 */
import { requireDriver } from '@/lib/server/require-driver';

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser, via, createdEndUser } = auth;

  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-authz',
        hypothesisId: 'DRV_SSO_ME_1',
        location: 'src/pages/api/driver/me.js',
        message: 'driver/me resolved',
        data: { via: String(via || ''), createdEndUser: Boolean(createdEndUser) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  return res.status(200).json({
    data: {
      id: endUser.id,
      email: endUser.email,
      name: endUser.name,
      phone: endUser.phone,
      rfidToken: endUser.rfidToken,
      rfidBalanceCents: endUser.rfidBalanceCents,
      billingProfile: endUser.billingProfile,
      consents: endUser.consents,
      paymentProfile: endUser.paymentProfile
        ? {
            id: endUser.paymentProfile.id,
            stripeCustomerId: endUser.paymentProfile.stripeCustomerId,
            stripePaymentMethodId: endUser.paymentProfile.stripePaymentMethodId,
            status: endUser.paymentProfile.status,
          }
        : null,
      rfidBalanceEur: (endUser.rfidBalanceCents || 0) / 100,
    },
  });
};

export default handler;

