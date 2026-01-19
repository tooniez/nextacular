/**
 * Super Admin Sessions Export (CSV)
 * GET: Export charging sessions across all workspaces
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { SessionStatus } from '@prisma/client';

function csvEscape(value) {
  const s = value === null || value === undefined ? '' : String(value);
  const escaped = s.replaceAll('"', '""');
  return `"${escaped}"`;
}

function buildWhere(req) {
  const where = {};
  const workspaceSlug = req.query.workspace || req.query.workspaceSlug || 'all';
  const status = req.query.status || 'all';
  const stationId = req.query.stationId || 'all';
  const month = req.query.month || null;
  const year = req.query.year || null;

  return prisma.$transaction(async (tx) => {
    // Workspace filter
    if (workspaceSlug && workspaceSlug !== 'all') {
      const workspace = await tx.workspace.findFirst({ where: { slug: workspaceSlug } });
      if (workspace) where.workspaceId = workspace.id;
    }

    // Status filter
    if (status && status !== 'all' && Object.values(SessionStatus).includes(status)) {
      where.status = status;
    }

    // Station filter
    if (stationId && stationId !== 'all') {
      where.stationId = stationId;
    }

    // Date filters (month/year)
    if (month && year) {
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      where.startTime = { gte: startDate, lte: endDate };
    } else if (year) {
      const yearNum = parseInt(year, 10);
      const startDate = new Date(yearNum, 0, 1);
      const endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
      where.startTime = { gte: startDate, lte: endDate };
    }

    return where;
  });
}

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'GET') {
    return res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  }

  try {
    await verifySuperAdmin(req, res);
    if (res.headersSent) return;

    const where = await buildWhere(req);
    const limit = Math.min(parseInt(req.query.limit || '2000', 10) || 2000, 10000);

    const sessions = await prisma.chargingSession.findMany({
      where,
      include: {
        workspace: { select: { slug: true, name: true } },
        station: { select: { ocppId: true, name: true, location: true } },
        connector: { select: { connectorId: true } },
        endUser: { select: { email: true, name: true } },
      },
      orderBy: [{ startTime: 'desc' }],
      take: limit,
    });

    const header = [
      'sessionId',
      'workspaceSlug',
      'workspaceName',
      'stationOcppId',
      'stationName',
      'stationLocation',
      'connectorId',
      'status',
      'stopReason',
      'startTime',
      'endTime',
      'durationSeconds',
      'energyKwh',
      'rfidToken',
      'driverName',
      'driverEmail',
      'paymentStatus',
      'paidAt',
      'grossAmount',
      'msFeeAmount',
      'subCpoEarningAmount',
      'currency',
      'roamingType',
      'clearingStatus',
    ]
      .map(csvEscape)
      .join(',');

    const lines = [header];
    for (const s of sessions) {
      lines.push(
        [
          s.id,
          s.workspace?.slug,
          s.workspace?.name,
          s.station?.ocppId,
          s.station?.name,
          s.station?.location,
          s.connector?.connectorId,
          s.status,
          s.stopReason,
          s.startTime?.toISOString?.() || s.startTime,
          s.endTime?.toISOString?.() || s.endTime,
          s.durationSeconds,
          s.energyKwh,
          s.rfidToken || s.ocppIdTag,
          s.endUser?.name || '',
          s.endUser?.email || '',
          s.paymentStatus,
          s.paidAt?.toISOString?.() || s.paidAt,
          s.grossAmount,
          s.msFeeAmount,
          s.subCpoEarningAmount,
          s.currency,
          s.roamingType,
          s.clearingStatus,
        ]
          .map(csvEscape)
          .join(',')
      );
    }

    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="sessions-export.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    console.error('GET /api/admin/sessions/export.csv error:', error);
    const status = error.message === 'Unauthorized: Super Admin access required' ? 401 : 500;
    if (!res.headersSent) {
      return res.status(status).json({
        errors: { error: { msg: error.message || 'Failed to export CSV' } },
      });
    }
  }
};

export default handler;

