import prisma from '@/prisma/index';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import { getDriverSessionFromReq, setDriverSessionCookie } from '@/lib/server/driver-session';

export async function requireDriver(req, res) {
  const cookieSession = getDriverSessionFromReq(req);
  const hasCookie = Boolean(cookieSession?.endUserId);

  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-authz',
        hypothesisId: 'DRV_SSO_1',
        location: 'src/lib/server/require-driver.js',
        message: 'requireDriver entry',
        data: { method: String(req?.method || ''), hasCookie },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  let session = cookieSession;
  let via = hasCookie ? 'cookie' : 'none';
  let createdEndUser = false;

  // If no driver cookie session, allow platform (NextAuth) users to act as driver too.
  if (!hasCookie) {
    const platformSession = await getServerSession(req, res, authOptions).catch(() => null);
    const rawEmail = platformSession?.user?.email ? String(platformSession.user.email) : '';
    const email = rawEmail.trim().toLowerCase();
    const emailPrefix = email ? email.slice(0, 3) : null;
    const emailDomain = email && email.includes('@') ? email.split('@').slice(1).join('@').slice(0, 64) : null;

    // #region agent log
    try {
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'driver-authz',
          hypothesisId: 'DRV_SSO_2',
          location: 'src/lib/server/require-driver.js',
          message: 'no cookie, check platform session',
          data: { platformAuthed: Boolean(platformSession?.user), emailPrefix, emailDomain },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion

    if (email) {
      let endUser = await prisma.endUser.findUnique({
        where: { email },
        include: { paymentProfile: true },
      });

      if (!endUser) {
        endUser = await prisma.endUser.create({
          data: {
            email,
            name: platformSession?.user?.name ? String(platformSession.user.name).slice(0, 120) : null,
            status: 'ACTIVE',
            rfidBalanceCents: 0,
          },
          include: { paymentProfile: true },
        });
        createdEndUser = true;
      }

      // Mint a driver cookie session so the driver SPA keeps working without a second login.
      session = { endUserId: endUser.id, email: endUser.email, iat: Date.now(), via: 'platform' };
      via = 'platform';
      try {
        setDriverSessionCookie(res, session, req);
      } catch {}

      // #region agent log
      try {
        fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'driver-authz',
            hypothesisId: 'DRV_SSO_3',
            location: 'src/lib/server/require-driver.js',
            message: 'platform -> endUser resolved',
            data: { createdEndUser, endUserIdPrefix: String(endUser.id).slice(0, 6) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      } catch {}
      // #endregion

      if (!endUser || endUser.deletedAt || endUser.status === 'DELETED') {
        res.status(401).json({ errors: { auth: { msg: 'Not authenticated' } } });
        return null;
      }
      if (endUser.status === 'SUSPENDED') {
        res.status(403).json({ errors: { auth: { msg: 'Account sospeso' } } });
        return null;
      }

      return { session, endUser, via, createdEndUser };
    }
  }

  if (!session?.endUserId) {
    res.status(401).json({ errors: { auth: { msg: 'Not authenticated' } } });
    return null;
  }

  const endUser = await prisma.endUser.findUnique({
    where: { id: session.endUserId },
    include: { paymentProfile: true },
  });

  if (!endUser || endUser.deletedAt || endUser.status === 'DELETED') {
    res.status(401).json({ errors: { auth: { msg: 'Not authenticated' } } });
    return null;
  }

  if (endUser.status === 'SUSPENDED') {
    res.status(403).json({ errors: { auth: { msg: 'Account sospeso' } } });
    return null;
  }

  return { session, endUser, via, createdEndUser };
}

