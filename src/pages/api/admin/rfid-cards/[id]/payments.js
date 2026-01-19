/**
 * Super Admin RFID Card Payments API
 * GET: Get payment transactions for a specific RFID card
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      // RBAC: Only Super Admin
      await verifySuperAdmin(req, res);

      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          errors: { id: { msg: 'Card ID is required' } },
        });
      }

      // Get user (RFID card owner)
      const user = await prisma.endUser.findUnique({
        where: { id },
        select: {
          id: true,
          paymentProfile: {
            select: {
              stripeCustomerId: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({
          errors: { card: { msg: 'Card not found' } },
        });
      }

      // TODO: Fetch payment transactions from Stripe
      // For now, return placeholder data structure
      // In a real implementation, you would:
      // 1. Get Stripe PaymentIntents for this customer
      // 2. Format them with date, channel, amount, status, authorization ID

      const payments = []; // Placeholder - would be fetched from Stripe

      res.status(200).json({
        data: payments,
      });
    } catch (error) {
      console.error('GET /api/admin/rfid-cards/[id]/payments error:', error);
      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }
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
