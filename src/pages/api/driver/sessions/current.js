/**
 * Driver current charging session
 * GET: returns current active session (or null)
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

export default async function handler(req, res) {
  const { method } = req;
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  if (method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const s = await prisma.chargingSession.findFirst({
    where: { endUserId: endUser.id, endTime: null, status: { in: ['ACTIVE', 'PENDING'] } },
    include: {
      station: { select: { id: true, name: true, location: true, ocppId: true } },
      connector: { select: { id: true, connectorId: true, connectorType: true, maxPower: true } },
    },
    orderBy: { startTime: 'desc' },
  });

  return res.status(200).json({ data: s || null });
}

