/**
 * Driver personal data
 * PATCH: { name?, phone? }
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'PATCH') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  const name = req.body?.name;
  const phone = req.body?.phone;

  const updated = await prisma.endUser.update({
    where: { id: endUser.id },
    data: {
      name: typeof name === 'string' ? name.trim() : undefined,
      phone: typeof phone === 'string' ? phone.trim() : undefined,
    },
    select: { id: true, name: true, phone: true },
  });

  return res.status(200).json({ data: updated });
};

export default handler;

