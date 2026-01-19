/**
 * Driver wallet summary
 * GET: balance + recent recharges + vouchers
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  const [user, recharges, redemptions] = await Promise.all([
    prisma.endUser.findUnique({
      where: { id: endUser.id },
      select: { rfidBalanceCents: true },
    }),
    prisma.cardRecharge.findMany({
      where: { endUserId: endUser.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.voucherRedemption.findMany({
      where: { endUserId: endUser.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return res.status(200).json({
    data: {
      balanceEur: ((user?.rfidBalanceCents || 0) / 100),
      recharges: recharges.map((r) => ({
        id: r.id,
        amountEur: r.amountCents / 100,
        status: r.status,
        channel: r.channel,
        createdAt: r.createdAt,
      })),
      vouchers: redemptions.map((v) => ({
        id: v.id,
        code: v.code,
        amountEur: v.amountCents / 100,
        createdAt: v.createdAt,
      })),
    },
  });
};

export default handler;

