/**
 * Driver change password
 * POST: { currentPassword, newPassword }
 */
import prisma from '@/prisma/index';
import bcrypt from 'bcryptjs';
import { requireDriver } from '@/lib/server/require-driver';

function isStrongEnough(pw) {
  const s = String(pw || '');
  if (s.length < 8) return false;
  // minimal: at least 1 letter + 1 number
  if (!/[A-Za-z]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  return true;
}

export default async function handler(req, res) {
  const { method } = req;
  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  if (method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ errors: { form: { msg: 'Password attuale e nuova password sono obbligatorie' } } });
  }
  if (!isStrongEnough(newPassword)) {
    return res.status(400).json({ errors: { newPassword: { msg: 'Password troppo debole (min 8 caratteri, lettere e numeri)' } } });
  }

  const user = await prisma.endUser.findUnique({
    where: { id: endUser.id },
    select: { id: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return res.status(400).json({ errors: { form: { msg: 'Password non configurata' } } });
  }

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-settings',
        hypothesisId: 'PW_1',
        location: 'api/driver/profile/password.js',
        message: 'wrong current password',
        data: {},
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return res.status(401).json({ errors: { currentPassword: { msg: 'Password attuale non corretta' } } });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.endUser.update({
    where: { id: endUser.id },
    data: { passwordHash: hash },
    select: { id: true },
  });

  // #region agent log
  fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'driver-settings',
      hypothesisId: 'PW_2',
      location: 'api/driver/profile/password.js',
      message: 'password changed',
      data: {},
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return res.status(200).json({ data: { ok: true } });
}

