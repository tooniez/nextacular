/**
 * Super Admin Payouts API
 * GET: List payout statements across all workspaces
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { PayoutStatus } from '@prisma/client';

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

    const search = (req.query.search || '').trim();
    const status = req.query.status || null;
    const from = req.query.from || null;
    const to = req.query.to || null;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 20;

    const where = {};

    if (status && Object.values(PayoutStatus).includes(status)) {
      where.status = status;
    }

    if (from || to) {
      where.periodStart = {};
      if (from) where.periodStart.gte = new Date(from);
      if (to) where.periodStart.lte = new Date(to);
    }

    if (search) {
      where.workspace = {
        is: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const total = await prisma.payoutStatement.count({ where });
    const statements = await prisma.payoutStatement.findMany({
      where,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return res.status(200).json({
      data: statements,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/payouts error:', error);
    if (error.message === 'Unauthorized: Super Admin access required') {
      return res.status(401).json({
        errors: { auth: { msg: error.message } },
      });
    }
    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;

