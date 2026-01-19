import { validateSession } from '@/config/api-validation';
import prisma from '@/prisma/index';
import { InvitationStatus, TeamRole } from '@prisma/client';

function agentLog(hypothesisId, message, data) {
  try {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'rbac',
        hypothesisId,
        location: 'src/lib/server/require-super-admin.js',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  } catch {}
}

export async function requireSuperAdmin(req, res) {
  if (res.headersSent) {
    return null;
  }

  try {
    const session = await validateSession(req, res);
    
    if (res.headersSent || !session || !session.user || !session.user.email) {
      return null;
    }

    const email = String(session.user.email || '').trim().toLowerCase();
    const superAdminEmails =
      process.env.SUPER_ADMIN_EMAILS?.split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean) || [];

    if (email && superAdminEmails.includes(email)) {
      return session;
    }

    // DB-based super admin: any accepted member with TeamRole.SUPER_ADMIN
    try {
      const member = await prisma.member.findFirst({
        where: { email, status: InvitationStatus.ACCEPTED, deletedAt: null, teamRole: TeamRole.SUPER_ADMIN },
        select: { id: true },
      });
      if (member) return session;
    } catch {}

    return null;
  } catch (error) {
    if (res.headersSent || error.responseSent) {
      return null;
    }
    throw error;
  }
}

export async function verifySuperAdmin(req, res) {
  if (res.headersSent) {
    const err = new Error('Response already sent');
    err.responseSent = true;
    throw err;
  }

  const session = await requireSuperAdmin(req, res);

  // validateSession may have already responded (401). Ensure we stop execution.
  if (res.headersSent) {
    const err = new Error('Response already sent');
    err.responseSent = true;
    throw err;
  }

  if (!session) {
    // #region agent log
    agentLog('RBAC_SA_1', 'deny super admin', { hasSession: false });
    // #endregion
    const err = new Error('Unauthorized: Super Admin access required');
    err.statusCode = 403;
    throw err;
  }

  // #region agent log
  agentLog('RBAC_SA_2', 'allow super admin', { email: String(session?.user?.email || '').slice(0, 3) });
  // #endregion
  return session;
}
