/**
 * Driver consents
 * PATCH: { consents }
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

  const consents = req.body?.consents;
  if (consents === undefined) {
    return res.status(400).json({ errors: { consents: { msg: 'consents required' } } });
  }

  const updated = await prisma.endUser.update({
    where: { id: endUser.id },
    data: { consents },
    select: { id: true, consents: true },
  });

  return res.status(200).json({ data: updated });
};

export default handler;

