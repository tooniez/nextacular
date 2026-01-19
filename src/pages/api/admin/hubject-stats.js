/**
 * Super Admin Hubject Stats API
 * GET: aggregate roaming (Hubject) statistics from charging sessions
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  try {
    await verifySuperAdmin(req, res);
    if (res.headersSent) return;

    const days = Math.min(parseInt(req.query.days || '30', 10) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where = {
      startTime: { gte: since },
      roamingType: { not: 'NONE' },
    };

    const grouped = await prisma.chargingSession.groupBy({
      by: ['roamingType', 'clearingStatus'],
      where,
      _count: { _all: true },
      _sum: {
        roamingGrossAmount: true,
        roamingNetAmount: true,
        grossAmount: true,
      },
      orderBy: [{ roamingType: 'asc' }, { clearingStatus: 'asc' }],
    });

    const recent = await prisma.chargingSession.findMany({
      where,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        roamingType: true,
        clearingStatus: true,
        hubjectSessionId: true,
        empId: true,
        cpoId: true,
        grossAmount: true,
        roamingGrossAmount: true,
        roamingNetAmount: true,
        currency: true,
        workspace: { select: { slug: true, name: true } },
        station: { select: { ocppId: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    });

    const totals = grouped.reduce(
      (acc, g) => {
        acc.totalSessions += g._count._all;
        acc.sumGross += g._sum.grossAmount || 0;
        acc.sumRoamingGross += g._sum.roamingGrossAmount || 0;
        acc.sumRoamingNet += g._sum.roamingNetAmount || 0;
        return acc;
      },
      { totalSessions: 0, sumGross: 0, sumRoamingGross: 0, sumRoamingNet: 0 }
    );

    return res.status(200).json({
      data: {
        since,
        days,
        totals,
        breakdown: grouped.map((g) => ({
          roamingType: g.roamingType,
          clearingStatus: g.clearingStatus,
          count: g._count._all,
          sumGrossAmount: g._sum.grossAmount || 0,
          sumRoamingGrossAmount: g._sum.roamingGrossAmount || 0,
          sumRoamingNetAmount: g._sum.roamingNetAmount || 0,
        })),
        recent,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/hubject-stats error:', error);
    const status = error.message === 'Unauthorized: Super Admin access required' ? 401 : 500;
    if (!res.headersSent) {
      return res.status(status).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }
};

export default handler;

