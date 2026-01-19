/**
 * Super Admin Products API (Subscription Plans)
 * GET: list plans
 * POST: create plan
 * PATCH: update plan by id
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;

  try {
    await verifySuperAdmin(req, res);
    if (res.headersSent) return;

    if (method === 'GET') {
      const search = (req.query.search || '').trim();
      const page = parseInt(req.query.page || '1', 10) || 1;
      const pageSize = parseInt(req.query.pageSize || '20', 10) || 20;

      const where = {};
      if (search) {
        where.OR = [
          { planCode: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ];
      }

      const total = await prisma.subscriptionPlan.count({ where });
      const data = await prisma.subscriptionPlan.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      return res.status(200).json({
        data,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      });
    }

    if (method === 'POST') {
      const { planCode, name, description, monthlyFeePerStation, currency } = req.body || {};
      const code = typeof planCode === 'string' ? planCode.trim() : '';
      const nm = typeof name === 'string' ? name.trim() : '';
      const fee = Number(monthlyFeePerStation);
      const cur = (currency || 'EUR').toString().toUpperCase();

      if (!code) return res.status(400).json({ errors: { planCode: { msg: 'planCode is required' } } });
      if (!nm) return res.status(400).json({ errors: { name: { msg: 'name is required' } } });
      if (!Number.isFinite(fee) || fee <= 0) {
        return res.status(400).json({ errors: { monthlyFeePerStation: { msg: 'monthlyFeePerStation must be > 0' } } });
      }

      const created = await prisma.subscriptionPlan.create({
        data: {
          planCode: code,
          name: nm,
          description: typeof description === 'string' ? description.trim() : null,
          monthlyFeePerStation: fee,
          currency: cur,
          isActive: true,
        },
      });

      return res.status(201).json({ data: created });
    }

    if (method === 'PATCH') {
      const { id, name, description, monthlyFeePerStation, currency, isActive } = req.body || {};
      if (!id) return res.status(400).json({ errors: { id: { msg: 'id is required' } } });

      const data = {};
      if (name !== undefined) data.name = String(name).trim();
      if (description !== undefined) data.description = description ? String(description) : null;
      if (monthlyFeePerStation !== undefined) data.monthlyFeePerStation = Number(monthlyFeePerStation);
      if (currency !== undefined) data.currency = String(currency).toUpperCase();
      if (isActive !== undefined) data.isActive = Boolean(isActive);

      const updated = await prisma.subscriptionPlan.update({
        where: { id: String(id) },
        data,
      });

      return res.status(200).json({ data: updated });
    }

    return res.status(405).json({
      errors: { error: { msg: `${method} method unsupported` } },
    });
  } catch (error) {
    console.error(`${method} /api/admin/products error:`, error);
    const status = error.message === 'Unauthorized: Super Admin access required' ? 401 : 500;
    if (!res.headersSent) {
      return res.status(status).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }
};

export default handler;

