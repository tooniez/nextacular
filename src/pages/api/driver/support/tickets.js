/**
 * Driver support tickets
 * GET: list tickets
 * POST: create { subject, message }
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

const handler = async (req, res) => {
  const { method } = req;
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  if (method === 'GET') {
    const tickets = await prisma.supportTicket.findMany({
      where: { endUserId: endUser.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.status(200).json({ data: tickets });
  }

  if (method === 'POST') {
    const subject = String(req.body?.subject || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!subject) return res.status(400).json({ errors: { subject: { msg: 'Oggetto obbligatorio' } } });
    if (!message) return res.status(400).json({ errors: { message: { msg: 'Messaggio obbligatorio' } } });

    const created = await prisma.supportTicket.create({
      data: { endUserId: endUser.id, subject, message, status: 'OPEN' },
    });
    return res.status(201).json({ data: created });
  }

  return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
};

export default handler;

