import prisma from '@/prisma/index';
import bcrypt from 'bcryptjs';
import { setDriverSessionCookie } from '@/lib/server/driver-session';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${req.method} method unsupported` } } });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const name = String(req.body?.name || '').trim() || null;
  const phone = String(req.body?.phone || '').trim() || null;
  const consents = req.body?.consents && typeof req.body.consents === 'object' ? req.body.consents : null;

  if (!email || !password) {
    return res.status(422).json({ errors: { form: { msg: 'Email e password sono obbligatorie' } } });
  }
  if (password.length < 8) {
    return res.status(422).json({ errors: { password: { msg: 'Password troppo corta (min 8)' } } });
  }

  const existing = await prisma.endUser.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return res.status(409).json({ errors: { email: { msg: 'Email già registrata' } } });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.endUser.create({
    data: {
      email,
      name,
      phone,
      passwordHash,
      consents: consents ? { ...consents, acceptedAt: new Date().toISOString() } : undefined,
      status: 'ACTIVE',
    },
    select: { id: true, email: true },
  });

  setDriverSessionCookie(
    res,
    {
      endUserId: user.id,
      email: user.email,
      iat: Date.now(),
    },
    req
  );

  return res.status(201).json({ data: { ok: true } });
}

