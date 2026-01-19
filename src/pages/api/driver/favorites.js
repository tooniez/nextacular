/**
 * Driver favorites
 * GET: list favorites
 * POST: { stationId }
 * DELETE: { stationId }
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

const handler = async (req, res) => {
  const { method } = req;
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  if (method === 'GET') {
    const favs = await prisma.favoriteStation.findMany({
      where: { endUserId: endUser.id },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            location: true,
            latitude: true,
            longitude: true,
            status: true,
            logoUrl: true,
            workspace: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ data: favs.map((f) => f.station) });
  }

  if (method === 'POST') {
    const { stationId } = req.body || {};
    if (!stationId) return res.status(400).json({ errors: { stationId: { msg: 'stationId required' } } });
    await prisma.favoriteStation.upsert({
      where: { endUserId_stationId: { endUserId: endUser.id, stationId: String(stationId) } },
      create: { endUserId: endUser.id, stationId: String(stationId) },
      update: {},
    });
    return res.status(200).json({ data: { ok: true } });
  }

  if (method === 'DELETE') {
    const { stationId } = req.body || {};
    if (!stationId) return res.status(400).json({ errors: { stationId: { msg: 'stationId required' } } });
    await prisma.favoriteStation.deleteMany({
      where: { endUserId: endUser.id, stationId: String(stationId) },
    });
    return res.status(200).json({ data: { ok: true } });
  }

  return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
};

export default handler;

