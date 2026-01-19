import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await verifySuperAdmin(req, res);

    const { id } = req.query;
    const {
      from = null,
      to = null,
      page = 1,
      pageSize = 20,
    } = req.query;

    const where = { workspaceId: id };

    if (from || to) {
      where.changedAt = {};
      if (from) {
        where.changedAt.gte = new Date(from);
      }
      if (to) {
        where.changedAt.lte = new Date(to);
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);

    const [history, total] = await Promise.all([
      prisma.workspaceFeePolicyHistory.findMany({
        where,
        include: {
          changedBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { changedAt: 'desc' },
        skip,
        take: parseInt(pageSize, 10),
      }),
      prisma.workspaceFeePolicyHistory.count({ where }),
    ]);

    return res.status(200).json({
      data: {
        data: history,
        pagination: {
          page: parseInt(page, 10),
          pageSize: parseInt(pageSize, 10),
          total,
          totalPages: Math.ceil(total / parseInt(pageSize, 10)),
        },
      },
    });
  } catch (error) {
    console.error('[api/admin/workspaces/[id]/history] Error:', error);
    if (error.statusCode === 403) {
      return res.status(403).json({
        errors: { auth: { msg: 'Unauthorized: Super Admin access required' } },
      });
    }
    return res.status(500).json({
      errors: { error: { msg: error.message || 'Internal server error' } },
    });
  }
};

export default handler;
