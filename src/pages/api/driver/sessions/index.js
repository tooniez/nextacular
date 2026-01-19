/**
 * Driver sessions
 * GET: list sessions (paged)
 * POST: start a new charging session { stationId, connectorId }
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

function round2(n) {
  return Math.round(n * 100) / 100;
}

async function resolveTariffSnapshot(workspaceId, stationId, connectorId) {
  const now = new Date();

  const assignment =
    (await prisma.tariffAssignment.findFirst({
      where: {
        connectorId: String(connectorId),
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      include: { tariff: true },
      orderBy: { validFrom: 'desc' },
    })) ||
    (await prisma.tariffAssignment.findFirst({
      where: {
        stationId: String(stationId),
        connectorId: null,
        validFrom: { lte: now },
        OR: [{ validUntil: null }, { validUntil: { gt: now } }],
      },
      include: { tariff: true },
      orderBy: { validFrom: 'desc' },
    })) ||
    (await prisma.tariffProfile.findFirst({
      where: { workspaceId: String(workspaceId), deletedAt: null, isActive: true },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    }).then((tariff) => (tariff ? { tariff } : null)));

  const t = assignment?.tariff || null;
  if (!t) return null;

  const msFeePercent = Number(t.msFeePercent);
  return {
    tariffSnapshotId: t.id,
    tariffBasePricePerKwh: round2(Number(t.basePricePerKwh)),
    tariffPricePerMinute: t.pricePerMinute !== null && t.pricePerMinute !== undefined ? round2(Number(t.pricePerMinute)) : null,
    tariffSessionStartFee: t.sessionStartFee !== null && t.sessionStartFee !== undefined ? round2(Number(t.sessionStartFee)) : null,
    tariffMsFeePercent: Number.isFinite(msFeePercent) ? msFeePercent : 15,
    tariffCurrency: t.currency || 'EUR',
    tariffSnapshotJson: JSON.stringify({
      id: t.id,
      name: t.name,
      basePricePerKwh: t.basePricePerKwh,
      pricePerMinute: t.pricePerMinute,
      sessionStartFee: t.sessionStartFee,
      msFeePercent: t.msFeePercent,
      currency: t.currency,
      version: t.version,
    }),
  };
}

export default async function handler(req, res) {
  const { method } = req;
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  if (method === 'GET') {
    const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
    const pageSize = Math.max(1, Math.min(parseInt(req.query?.pageSize, 10) || 20, 50));
    const skip = (page - 1) * pageSize;

    const sessions = await prisma.chargingSession.findMany({
      where: { endUserId: endUser.id },
      include: {
        station: { select: { id: true, name: true, location: true } },
        connector: { select: { id: true, connectorId: true, connectorType: true, maxPower: true } },
      },
      orderBy: { startTime: 'desc' },
      skip,
      take: pageSize,
    });
    return res.status(200).json({ data: sessions, meta: { page, pageSize } });
  }

  if (method !== 'POST') return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });

  const { stationId, connectorId } = req.body || {};
  if (!stationId) return res.status(400).json({ errors: { stationId: { msg: 'stationId required' } } });
  if (!connectorId) return res.status(400).json({ errors: { connectorId: { msg: 'connectorId required' } } });

  // Only one active session per user
  const existing = await prisma.chargingSession.findFirst({
    where: {
      endUserId: endUser.id,
      endTime: null,
      status: { in: ['ACTIVE', 'PENDING'] },
    },
    select: { id: true, status: true },
  });
  if (existing) {
    return res.status(409).json({ errors: { session: { msg: 'Hai già una ricarica in corso' } }, data: existing });
  }

  // Validate station + connector
  const connector = await prisma.connector.findFirst({
    where: { id: String(connectorId), stationId: String(stationId) },
    include: { station: { select: { id: true, workspaceId: true } } },
  });
  if (!connector) {
    return res.status(404).json({ errors: { connector: { msg: 'Connettore non trovato' } } });
  }

  // Optional: enforce reservation (if user has one, it must match station)
  const activeRes = await prisma.stationReservation.findFirst({
    where: { endUserId: endUser.id, status: 'ACTIVE', reservedUntil: { gt: new Date() } },
    select: { id: true, stationId: true },
    orderBy: { createdAt: 'desc' },
  });
  if (activeRes && String(activeRes.stationId) !== String(stationId)) {
    return res.status(409).json({ errors: { reservation: { msg: 'Hai una prenotazione attiva su un’altra stazione' } } });
  }

  const tariff = await resolveTariffSnapshot(connector.station.workspaceId, stationId, connectorId);
  const now = new Date();

  const created = await prisma.chargingSession.create({
    data: {
      workspaceId: connector.station.workspaceId,
      stationId: String(stationId),
      connectorId: String(connectorId),
      endUserId: endUser.id,
      startTime: now,
      status: 'ACTIVE',
      ...(tariff || {}),
      currency: (tariff && tariff.tariffCurrency) || 'EUR',
    },
  });

  return res.status(201).json({ data: created });
}

