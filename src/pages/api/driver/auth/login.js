import prisma from '@/prisma/index';
import bcrypt from 'bcryptjs';
import { setDriverSessionCookie } from '@/lib/server/driver-session';

export default async function handler(req, res) {
  // #region agent log
  try {
    const emailPrefix = String(req.body?.email || '').trim().toLowerCase().slice(0, 3);
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-auth',
        hypothesisId: 'H_D_1',
        location: 'pages/api/driver/auth/login.js',
        message: 'driver login entry',
        data: { method: req?.method, hasEmail: Boolean(req.body?.email), hasPassword: Boolean(req.body?.password), emailPrefix },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  if (req.method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${req.method} method unsupported` } } });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(422).json({ errors: { form: { msg: 'Email e password sono obbligatorie' } } });
  }

  const user = await prisma.endUser.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, status: true, deletedAt: true },
  });

  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-auth',
        hypothesisId: 'H_D_2',
        location: 'pages/api/driver/auth/login.js',
        message: 'driver user lookup',
        data: { found: Boolean(user), hasPasswordHash: Boolean(user?.passwordHash), status: user?.status || null, deleted: Boolean(user?.deletedAt) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  if (!user || user.deletedAt || user.status === 'DELETED') {
    return res.status(401).json({ errors: { auth: { msg: 'Credenziali non valide' } } });
  }
  if (user.status === 'SUSPENDED') {
    return res.status(403).json({ errors: { auth: { msg: 'Account sospeso' } } });
  }
  if (!user.passwordHash) {
    return res.status(401).json({ errors: { auth: { msg: 'Credenziali non valide' } } });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-auth',
        hypothesisId: 'H_D_3',
        location: 'pages/api/driver/auth/login.js',
        message: 'driver password compare',
        data: { ok: Boolean(ok) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion
  if (!ok) {
    return res.status(401).json({ errors: { auth: { msg: 'Credenziali non valide' } } });
  }

  setDriverSessionCookie(
    res,
    {
      endUserId: user.id,
      email: user.email,
      iat: Date.now(),
    },
    req
  );

  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-auth',
        hypothesisId: 'H_D_4',
        location: 'pages/api/driver/auth/login.js',
        message: 'driver session cookie set',
        data: { ok: true },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  return res.status(200).json({ data: { ok: true } });
}

