/**
 * Admin identity/roles for UI gating.
 * GET -> { isSuperAdmin, isOrgManager }
 *
 * - isSuperAdmin: email in SUPER_ADMIN_EMAILS
 * - isOrgManager: super admin OR member has ADMIN/OWNER/SUPER_ADMIN role in any workspace
 */
import prisma from '@/prisma/index';
import { validateSession } from '@/config/api-validation';
import { InvitationStatus, TeamRole } from '@prisma/client';
import { getDriverSessionFromReq } from '@/lib/server/driver-session';

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
        location: 'src/pages/api/admin/me.js',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  } catch {}
}

export default async function handler(req, res) {
  const { method } = req;
  if (method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  try {
    // If user is authenticated as DRIVER (separate session cookie), do not return 401 here.
    // This keeps the "unified login" UX consistent when someone checks /api/admin/me.
    const driverSession = getDriverSessionFromReq(req);
    if (driverSession?.endUserId) {
      const email = String(driverSession?.email || '').trim().toLowerCase();
      const emailPrefix = email ? email.split('@')[0].slice(0, 3) : null;
      const emailDomain = email && email.includes('@') ? email.split('@').slice(1).join('@').slice(0, 64) : null;

      // #region agent log
      agentLog('RBAC_ME_D1', 'admin me via driver_session', {
        hasDriverSession: true,
        hasEndUserId: true,
        hasEmail: Boolean(email),
        emailPrefix,
        emailDomain,
      });
      // #endregion

      return res.status(200).json({
        data: { isSuperAdmin: false, isOrgManager: false, isDriver: true },
      });
    }

    const session = await validateSession(req, res);
    if (res.headersSent) return;

    const email = String(session?.user?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(401).json({ errors: { auth: { msg: 'Unauthorized' } } });
    }
    const emailParts = email.split('@');
    const emailPrefix = String(emailParts[0] || '').slice(0, 3);
    const emailDomain = String(emailParts[1] || '').slice(0, 64);

    const superAdminEmails =
      process.env.SUPER_ADMIN_EMAILS?.split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean) || [];
    const isSuperAdminAllowlist = superAdminEmails.includes(email);

    // DB-based Super Admin: any accepted member with TeamRole.SUPER_ADMIN
    // (aligns with requireSuperAdmin/verifySuperAdmin behavior)
    const superAdminMember = await prisma.member.findFirst({
      where: {
        email,
        status: InvitationStatus.ACCEPTED,
        deletedAt: null,
        teamRole: TeamRole.SUPER_ADMIN,
      },
      select: { id: true, workspaceId: true },
    });
    const isSuperAdminDb = Boolean(superAdminMember);

    const isSuperAdmin = isSuperAdminAllowlist || isSuperAdminDb;

    let isOrgManager = isSuperAdmin;
    if (!isOrgManager) {
      const member = await prisma.member.findFirst({
        where: {
          email,
          status: InvitationStatus.ACCEPTED,
          deletedAt: null,
          teamRole: { in: [TeamRole.ADMIN, TeamRole.OWNER, TeamRole.SUPER_ADMIN] },
        },
        select: { id: true, teamRole: true },
      });
      isOrgManager = Boolean(member);
    }

    // #region agent log
    agentLog('RBAC_ME_1', 'admin me', { isSuperAdmin, isOrgManager });
    agentLog('RBAC_ME_2', 'admin me details', {
      hasEmail: Boolean(email),
      allowlistCount: superAdminEmails.length,
      isSuperAdminAllowlist,
      isSuperAdminDb,
    });
    agentLog('RBAC_ME_3', 'admin me email+db probe', {
      emailPrefix,
      emailDomain,
      superAdminMemberFound: Boolean(superAdminMember),
      superAdminMemberWorkspaceIdPrefix: superAdminMember?.workspaceId ? String(superAdminMember.workspaceId).slice(0, 6) : null,
    });
    // #endregion

    return res.status(200).json({ data: { isSuperAdmin, isOrgManager } });
  } catch (error) {
    if (error?.responseSent || res.headersSent) return;
    return res.status(500).json({ errors: { error: { msg: error.message || 'Internal server error' } } });
  }
}

