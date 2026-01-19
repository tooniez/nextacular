/**
 * Driver stop session (simulation)
 * POST: closes the session and captures payment (mock)
 */
import prisma from '@/prisma/index';
import { getDriverSessionFromReq } from '@/lib/server/driver-session';

function round2(n) {
  return Math.round(n * 100) / 100;
}

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;
  if (method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const session = getDriverSessionFromReq(req);
  if (!session?.endUserId) {
    return res.status(401).json({ errors: { auth: { msg: 'Not authenticated' } } });
  }

  const item = await prisma.chargingSession.findFirst({
    where: { id: String(id), endUserId: session.endUserId },
  });
  if (!item) {
    return res.status(404).json({ errors: { session: { msg: 'Sessione non trovata' } } });
  }
  if (item.endTime) {
    return res.status(200).json({ data: item });
  }

  const now = new Date();
  const start = new Date(item.startTime);
  const durationSeconds = Math.max(60, Math.min(Math.floor((now - start) / 1000), 3 * 3600));
  // Simulate energy delivered based on duration and typical 7kW average
  const energyKwh = round2(Math.min(60, Math.max(0.5, (durationSeconds / 3600) * 7)));

  const pricePerKwh = item.tariffBasePricePerKwh || 0.45;
  const msFeePercent = item.tariffMsFeePercent || 15;
  const gross = round2(energyKwh * pricePerKwh);
  const msFee = round2((gross * msFeePercent) / 100);
  const subCpo = round2(gross - msFee);

  const updated = await prisma.chargingSession.update({
    where: { id: item.id },
    data: {
      endTime: now,
      durationSeconds,
      energyKwh,
      status: 'COMPLETED',
      stopReason: 'REMOTE',
      billingStatus: 'BILLED',
      billedAt: now,
      grossAmount: gross,
      msFeeAmount: msFee,
      subCpoEarningAmount: subCpo,
      paymentStatus: 'CAPTURED',
      capturedAmountCents: Math.round(gross * 100),
      paidAt: now,
    },
  });

  return res.status(200).json({ data: updated });
};

export default handler;

