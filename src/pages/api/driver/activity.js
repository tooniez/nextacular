/**
 * Driver activity feed
 * GET: aggregated items (sessions, wallet ops, reservations, tickets)
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

function toItem(type, createdAt, payload) {
  return { type, createdAt, payload };
}

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  const [sessions, recharges, redemptions, reservations, tickets] = await Promise.all([
    prisma.chargingSession.findMany({
      where: { endUserId: endUser.id },
      include: { station: { select: { name: true, location: true } } },
      orderBy: { startTime: 'desc' },
      take: 50,
    }),
    prisma.cardRecharge.findMany({
      where: { endUserId: endUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.voucherRedemption.findMany({
      where: { endUserId: endUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.stationReservation.findMany({
      where: { endUserId: endUser.id },
      include: { station: { select: { name: true, location: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.supportTicket.findMany({
      where: { endUserId: endUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ]);

  const items = [
    ...sessions.map((s) =>
      toItem('SESSION', s.startTime, {
        id: s.id,
        station: s.station?.name,
        location: s.station?.location,
        status: s.status,
        energyKwh: s.energyKwh,
        grossAmount: s.grossAmount,
      })
    ),
    ...recharges.map((r) =>
      toItem('TOPUP', r.createdAt, { id: r.id, amountEur: r.amountCents / 100, status: r.status, channel: r.channel })
    ),
    ...redemptions.map((v) =>
      toItem('VOUCHER', v.createdAt, { id: v.id, code: v.code, amountEur: v.amountCents / 100 })
    ),
    ...reservations.map((r) =>
      toItem('RESERVATION', r.createdAt, {
        id: r.id,
        station: r.station?.name,
        status: r.status,
        reservedUntil: r.reservedUntil,
        feeEur: (r.feeCents || 0) / 100,
      })
    ),
    ...tickets.map((t) =>
      toItem('TICKET', t.createdAt, { id: t.id, subject: t.subject, status: t.status })
    ),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 100);

  return res.status(200).json({ data: items });
};

export default handler;

