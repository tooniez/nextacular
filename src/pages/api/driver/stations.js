/**
 * Driver stations list
 * GET: list stations + connectors (public - browse mode)
 */
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const stations = await prisma.chargingStation.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      ocppId: true,
      name: true,
      location: true,
      latitude: true,
      longitude: true,
      status: true,
      logoUrl: true,
      photoUrls: true,
      workspace: { select: { slug: true, name: true } },
      connectors: {
        where: {},
        orderBy: { connectorId: 'asc' },
        select: {
          id: true,
          connectorId: true,
          name: true,
          status: true,
          maxPower: true,
          connectorType: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });

  return res.status(200).json({ data: stations });
};

export default handler;

