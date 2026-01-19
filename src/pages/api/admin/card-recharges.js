/**
 * Super Admin Card Recharges API
 * GET: Get all card recharges
 * POST: Create new card recharge
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);
      if (res.headersSent) return;

      // Get query params
      const month = req.query.month || null;
      const year = req.query.year || null;
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 50;

      // Build date filter
      let startDate, endDate;
      if (month && year) {
        const monthNum = parseInt(month);
        const yearNum = parseInt(year);
        startDate = new Date(yearNum, monthNum - 1, 1);
        endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      } else if (year) {
        const yearNum = parseInt(year);
        startDate = new Date(yearNum, 0, 1);
        endDate = new Date(yearNum, 11, 31, 23, 59, 59, 999);
      } else {
        // Default to current month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      const where = {
        createdAt: { gte: startDate, lte: endDate },
      };

      const total = await prisma.cardRecharge.count({ where });
      const recharges = await prisma.cardRecharge.findMany({
        where,
        include: {
          endUser: {
            select: {
              id: true,
              email: true,
              name: true,
              rfidToken: true,
              rfidBalanceCents: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      res.status(200).json({
        data: recharges.map((r) => ({
          id: r.id,
          createdAt: r.createdAt,
          channel: r.channel,
          amount: r.amountCents / 100,
          status: r.status,
          cardSerial: r.cardSerial,
          cardType: 'Digitale',
          pointOfSale: r.createdByEmail
            ? { name: r.createdByName || r.createdByEmail, email: r.createdByEmail }
            : null,
          endUser: r.endUser
            ? {
                id: r.endUser.id,
                email: r.endUser.email,
                name: r.endUser.name,
                rfidToken: r.endUser.rfidToken,
                balanceEur: (r.endUser.rfidBalanceCents || 0) / 100,
              }
            : null,
        })),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error) {
      console.error('GET /api/admin/card-recharges error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else if (method === 'POST') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);
      if (res.headersSent) return;

      const { cardSerial, amount } = req.body;

      // Validate
      if (!cardSerial) {
        return res.status(400).json({
          errors: { cardSerial: { msg: 'Seriale carta è obbligatorio' } },
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          errors: { amount: { msg: 'Importo deve essere maggiore di 0' } },
        });
      }

      // Find user by RFID token
      const user = await prisma.endUser.findUnique({
        where: { rfidToken: cardSerial },
        include: {
          paymentProfile: {
            select: {
              stripeCustomerId: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          errors: { cardSerial: { msg: 'Carta non trovata' } },
        });
      }

      const amountCents = Math.round(parseFloat(amount) * 100);
      const createdByEmail = req?.body?.createdByEmail || null;

      // We can derive operator from NextAuth session if available (optional)
      let operatorEmail = createdByEmail;
      let operatorName = null;
      try {
        // Avoid hard dependency; use request cookie identity via next-auth session endpoint is costly here
        operatorEmail = operatorEmail || null;
      } catch {
        // ignore
      }

      const recharge = await prisma.$transaction(async (tx) => {
        const created = await tx.cardRecharge.create({
          data: {
            endUserId: user.id,
            cardSerial,
            amountCents,
            currency: 'EUR',
            status: 'COMPLETED',
            channel: 'manual',
            createdByEmail: operatorEmail,
            createdByName: operatorName,
          },
        });

        await tx.endUser.update({
          where: { id: user.id },
          data: { rfidBalanceCents: { increment: amountCents } },
        });

        return created;
      });

      res.status(201).json({
        data: {
          id: recharge.id,
          cardSerial,
          amount: amountCents / 100,
          status: recharge.status,
          createdAt: recharge.createdAt,
          channel: recharge.channel,
        },
      });
    } catch (error) {
      console.error('POST /api/admin/card-recharges error:', error);
      res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  } else {
    res
      .status(405)
      .json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
};

export default handler;
