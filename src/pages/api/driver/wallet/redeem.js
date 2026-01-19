/**
 * Driver redeem voucher
 * POST: { code }
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ errors: { code: { msg: 'Codice obbligatorio' } } });

  const voucher = await prisma.voucher.findUnique({ where: { code } });
  if (!voucher || !voucher.isActive) {
    return res.status(404).json({ errors: { code: { msg: 'Voucher non valido' } } });
  }
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
    return res.status(400).json({ errors: { code: { msg: 'Voucher scaduto' } } });
  }

  try {
    const redemption = await prisma.$transaction(async (tx) => {
      const r = await tx.voucherRedemption.create({
        data: {
          code: voucher.code,
          endUserId: endUser.id,
          amountCents: voucher.amountCents,
          currency: voucher.currency || 'EUR',
        },
      });
      await tx.endUser.update({
        where: { id: endUser.id },
        data: { rfidBalanceCents: { increment: voucher.amountCents } },
      });
      return r;
    });

    return res.status(200).json({
      data: { code: redemption.code, amountEur: redemption.amountCents / 100 },
    });
  } catch (e) {
    // Unique constraint => already redeemed
    return res.status(409).json({ errors: { code: { msg: 'Voucher già riscattato' } } });
  }
};

export default handler;

