/**
 * Driver session detail
 * GET: session by id (must belong to current endUser)
 */
import prisma from '@/prisma/index';
import { getDriverSessionFromReq } from '@/lib/server/driver-session';

const handler = async (req, res) => {
  const { method } = req;
  const { id } = req.query;
  if (method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const session = getDriverSessionFromReq(req);
  if (!session?.endUserId) {
    return res.status(401).json({ errors: { auth: { msg: 'Not authenticated' } } });
  }

  const item = await prisma.chargingSession.findFirst({
    where: { id: String(id), endUserId: session.endUserId },
    include: {
      station: { select: { id: true, name: true, ocppId: true, location: true } },
      connector: { select: { id: true, connectorId: true, connectorType: true, maxPower: true } },
    },
  });
  if (!item) {
    return res.status(404).json({ errors: { session: { msg: 'Sessione non trovata' } } });
  }
  return res.status(200).json({ data: item });
};

export default handler;

