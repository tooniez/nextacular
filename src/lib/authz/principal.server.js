import { getServerSession } from 'next-auth/next';
import prisma from '@/prisma/index';
import { authOptions } from '@/lib/server/auth';
import { getDriverSessionFromReq } from '@/lib/server/driver-session';
import { InvitationStatus, TeamRole } from '@prisma/client';
import { GlobalRole } from './roles';
import { permissionsForWorkspaceRole } from './permissions';

function safeEmailParts(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e.includes('@')) return { email: e, prefix: null, domain: null };
  const [p, ...rest] = e.split('@');
  return { email: e, prefix: String(p || '').slice(0, 3), domain: String(rest.join('@') || '').slice(0, 64) };
}

/**
 * Returns a unified "principal" for the current request.
 * - platform session: NextAuth (Admin/Sub-CPO/SuperAdmin)
 * - driver session: custom cookie driver_session
 *
 * This function NEVER writes to res (no side-effects).
 */
export async function getPrincipalFromReq(req, res) {
  const driverSession = getDriverSessionFromReq(req);
  const driverEmail = safeEmailParts(driverSession?.email || '');

  const platformSession = await getServerSession(req, res, authOptions);
  const platformEmail = safeEmailParts(platformSession?.user?.email || '');
  const platformUserId = platformSession?.user?.id || platformSession?.user?.userId || null;

  // Super Admin resolution: allowlist OR any member row with TeamRole.SUPER_ADMIN
  let globalRole = GlobalRole.NONE;
  let isSuperAdmin = false;
  try {
    const allowlist =
      process.env.SUPER_ADMIN_EMAILS?.split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean) || [];
    const allow = platformEmail.email && allowlist.includes(platformEmail.email);
    let db = false;
    if (platformEmail.email) {
      const m = await prisma.member.findFirst({
        where: {
          email: platformEmail.email,
          deletedAt: null,
          status: InvitationStatus.ACCEPTED,
          teamRole: TeamRole.SUPER_ADMIN,
        },
        select: { id: true },
      });
      db = Boolean(m);
    }
    isSuperAdmin = Boolean(allow || db);
    if (isSuperAdmin) globalRole = GlobalRole.SUPER_ADMIN;
  } catch {
    // fail closed (not super admin)
  }

  // Workspace memberships (platform users only)
  let memberships = [];
  if (platformEmail.email) {
    try {
      memberships = await prisma.member.findMany({
        where: { email: platformEmail.email, deletedAt: null, status: InvitationStatus.ACCEPTED },
        select: {
          workspaceId: true,
          teamRole: true,
          workspace: { select: { id: true, slug: true, name: true } },
        },
        // Member model has invitedAt/joinedAt/updatedAt (no createdAt)
        orderBy: [{ invitedAt: 'asc' }, { updatedAt: 'asc' }],
        take: 25,
      });
    } catch (e) {
      // #region agent log
      try {
        fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'authz',
            hypothesisId: 'AUTHZ_PRINC_1',
            location: 'src/lib/authz/principal.server.js',
            message: 'member.findMany failed',
            data: { err: e?.message ? String(e.message).slice(0, 160) : 'unknown', emailPrefix: platformEmail.prefix },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      } catch {}
      // #endregion
      memberships = [];
    }
  }

  const workspaces = memberships
    .map((m) => ({
      id: m.workspace?.id || m.workspaceId,
      slug: m.workspace?.slug || null,
      name: m.workspace?.name || null,
      role: m.teamRole || null,
      permissions: permissionsForWorkspaceRole(m.teamRole),
    }))
    .filter((w) => Boolean(w.id));

  return {
    platform: {
      isAuthenticated: Boolean(platformSession?.user),
      userId: platformUserId ? String(platformUserId) : null,
      emailPrefix: platformEmail.prefix,
      emailDomain: platformEmail.domain,
    },
    driver: {
      isAuthenticated: Boolean(driverSession?.endUserId),
      endUserId: driverSession?.endUserId ? String(driverSession.endUserId) : null,
      emailPrefix: driverEmail.prefix,
      emailDomain: driverEmail.domain,
    },
    globalRole,
    isSuperAdmin,
    workspaces,
  };
}

