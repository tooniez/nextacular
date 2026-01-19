/**
 * Organizations Permission Checker
 * Allows Super Admin OR users with ADMIN/OWNER role in any workspace
 * (or a specific workspace if workspaceId is provided)
 */

import { validateSession } from '@/config/api-validation';
import { getWorkspaceMemberRole } from '@/prisma/services/station';
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
        location: 'src/lib/server/require-organizations-permission.js',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  } catch {}
}

/**
 * Check if user has permission to manage organizations
 * @param {object} session - User session
 * @param {string} workspaceId - Optional workspace ID (if checking specific workspace)
 * @returns {Promise<boolean>} True if user has permission
 */
async function hasOrganizationsPermission(session, workspaceId = null) {
  if (!session || !session.user || !session.user.email) {
    return false;
  }

  // Check if user is Super Admin (via email)
  const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  if (superAdminEmails.includes(session.user.email)) {
    return true;
  }

  // Check if user has SUPER_ADMIN role globally
  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return false;
    }

    // Check if user has ADMIN or OWNER role in any workspace
    // (or specific workspace if provided)
    const memberWhere = {
      email: session.user.email,
      status: InvitationStatus.ACCEPTED,
      deletedAt: null,
      teamRole: { in: [TeamRole.ADMIN, TeamRole.OWNER, TeamRole.SUPER_ADMIN] },
    };

    if (workspaceId) {
      memberWhere.workspaceId = workspaceId;
    }

    const member = await prisma.member.findFirst({
      where: memberWhere,
      select: { teamRole: true },
    });

    if (member && [TeamRole.ADMIN, TeamRole.OWNER, TeamRole.SUPER_ADMIN].includes(member.teamRole)) {
      return true;
    }
  } catch (error) {
    console.error('[require-organizations-permission] Error:', error);
    return false;
  }

  return false;
}

/**
 * Require organizations permission (returns session or null)
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {string} workspaceId - Optional workspace ID
 * @returns {Promise<object|null>} Session if authorized, null otherwise
 */
export async function requireOrganizationsPermission(req, res, workspaceId = null) {
  if (res.headersSent) {
    return null;
  }

  try {
    const session = await validateSession(req, res);
    
    if (res.headersSent || !session || !session.user || !session.user.email) {
      return null;
    }

    const hasPermission = await hasOrganizationsPermission(session, workspaceId);
    
    if (hasPermission) {
      return session;
    }
    
    return null;
  } catch (error) {
    if (res.headersSent || error.responseSent) {
      return null;
    }
    throw error;
  }
}

/**
 * Verify organizations permission (throws error or returns session)
 * @param {object} req - Request object
 * @param {object} res - Response object
 * @param {string} workspaceId - Optional workspace ID
 * @returns {Promise<object>} Session if authorized
 */
export async function verifyOrganizationsPermission(req, res, workspaceId = null) {
  if (res.headersSent) {
    const err = new Error('Response already sent');
    err.responseSent = true;
    throw err;
  }

  const session = await requireOrganizationsPermission(req, res, workspaceId);

  // validateSession may have already responded (401). Ensure we stop execution.
  if (res.headersSent) {
    const err = new Error('Response already sent');
    err.responseSent = true;
    throw err;
  }

  if (!session) {
    // #region agent log
    agentLog('RBAC_ORG_1', 'deny org permission', { workspaceId: workspaceId ? String(workspaceId).slice(0, 8) : null });
    // #endregion
    const err = new Error('Unauthorized: Super Admin or Organizations Manager access required');
    err.statusCode = 403;
    throw err;
  }

  // #region agent log
  agentLog('RBAC_ORG_2', 'allow org permission', { workspaceId: workspaceId ? String(workspaceId).slice(0, 8) : null });
  // #endregion
  return session;
}
