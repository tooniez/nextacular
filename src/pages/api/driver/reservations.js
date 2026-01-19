/**
 * Driver reservations
 * GET: current active reservation (or null)
 * POST: create reservation { stationId, connectorId?, minutes? }
 * DELETE: cancel reservation { reservationId }
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

async function expireOldReservations() {
  const now = new Date();
  await prisma.stationReservation.updateMany({
    where: { status: 'ACTIVE', reservedUntil: { lt: now } },
    data: { status: 'EXPIRED' },
  });
}

const handler = async (req, res) => {
  const { method } = req;
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  await expireOldReservations();

  if (method === 'GET') {
    const current = await prisma.stationReservation.findFirst({
      where: { endUserId: endUser.id, status: 'ACTIVE', reservedUntil: { gt: new Date() } },
      include: {
        station: { select: { id: true, name: true, location: true, ocppId: true } },
        connector: { select: { id: true, connectorId: true, connectorType: true, maxPower: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ data: current || null });
  }

  if (method === 'POST') {
    const { stationId, connectorId = null, minutes = 15 } = req.body || {};
    if (!stationId) return res.status(400).json({ errors: { stationId: { msg: 'stationId required' } } });
    const mins = Math.max(5, Math.min(parseInt(minutes, 10) || 15, 30));

    // Only one active reservation per user
    const existing = await prisma.stationReservation.findFirst({
      where: { endUserId: endUser.id, status: 'ACTIVE', reservedUntil: { gt: new Date() } },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ errors: { reservation: { msg: 'Hai già una prenotazione attiva' } } });
    }

    const feeCents = 50; // default 0.50€ like many apps; can be tuned via platform settings later
    const reservedUntil = new Date(Date.now() + mins * 60 * 1000);

    const created = await prisma.stationReservation.create({
      data: {
        endUserId: endUser.id,
        stationId: String(stationId),
        connectorId: connectorId ? String(connectorId) : null,
        reservedUntil,
        feeCents,
        currency: 'EUR',
        status: 'ACTIVE',
      },
      include: {
        station: { select: { id: true, name: true, location: true, ocppId: true } },
        connector: { select: { id: true, connectorId: true, connectorType: true, maxPower: true } },
      },
    });

    return res.status(201).json({ data: created });
  }

  if (method === 'DELETE') {
    const { reservationId } = req.body || {};
    if (!reservationId) return res.status(400).json({ errors: { reservationId: { msg: 'reservationId required' } } });

    const updated = await prisma.stationReservation.updateMany({
      where: { id: String(reservationId), endUserId: endUser.id, status: 'ACTIVE' },
      data: { status: 'CANCELLED' },
    });
    if (updated.count === 0) {
      return res.status(404).json({ errors: { reservation: { msg: 'Prenotazione non trovata' } } });
    }
    return res.status(200).json({ data: { ok: true } });
  }

  return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
};

export default handler;

