import { getWorkspaceMemberRole } from '@/prisma/services/station';
import { getWorkspace } from '@/prisma/services/workspace';
import prisma from '@/prisma/index';

/**
 * Role hierarchy (from lowest to highest permission)
 */
const ROLE_HIERARCHY = {
  READONLY: 1,
  FINANCE: 1, // Same level as READONLY (read-only)
  TECHNICIAN: 2,
  OPERATOR: 2, // Same level as TECHNICIAN (edit, no delete)
  MEMBER: 3,
  ADMIN: 4,
  OWNER: 5,
  SUPER_ADMIN: 6,
};

/**
 * Check if user role has required minimum role level
 */
const hasMinimumRole = (userRole, minRole) => {
  if (!userRole) return false;
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const minLevel = ROLE_HIERARCHY[minRole] || 0;
  return userLevel >= minLevel;
};

/**
 * Check if user role is in allowed roles list
 */
const isRoleAllowed = (userRole, allowedRoles) => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};

/**
 * Get workspace ID from slug or ID
 */
const resolveWorkspaceId = async (workspaceSlugOrId, userEmail) => {
  if (!workspaceSlugOrId) return null;

  const trimmed = String(workspaceSlugOrId).trim();
  if (!trimmed) return null;

  // #region agent log
  fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'H2',
      location: 'src/lib/server/require-workspace-role.js',
      message: 'resolveWorkspaceId start',
      data: { len: trimmed.length, hasHyphen: trimmed.includes('-') },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  // Try as ID first (covers cuid/cuid2); if found, return.
  const byId = await prisma.workspace.findFirst({
    where: { id: trimmed, deletedAt: null },
    select: { id: true },
  });
  if (byId?.id) {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'H2',
        location: 'src/lib/server/require-workspace-role.js',
        message: 'resolveWorkspaceId matched by ID',
        data: { matched: true },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return byId.id;
  }

  // Otherwise treat as slug.
  const workspace = await getWorkspace(trimmed);

  // #region agent log
  fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'post-fix',
      hypothesisId: 'H2',
      location: 'src/lib/server/require-workspace-role.js',
      message: 'resolveWorkspaceId matched by slug?',
      data: { matched: Boolean(workspace?.id) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return workspace?.id || null;
};

/**
 * Verify user has required role in workspace
 * @param {object} session - Session from validateSession
 * @param {string} workspaceSlugOrId - Workspace slug or ID
 * @param {string|string[]} requiredRole - Minimum role (string) or allowed roles (array)
 * @returns {object} { workspaceId, userRole } or throws error
 */
export const verifyWorkspaceRole = async (session, workspaceSlugOrId, requiredRole) => {
  if (!session || !session.user || !session.user.email) {
    throw new Error('Unauthorized access');
  }

  // Resolve workspace ID
  const workspaceId = await resolveWorkspaceId(workspaceSlugOrId, session.user.email);
  if (!workspaceId) {
    throw new Error('Workspace not found');
  }

  // Get user role in workspace
  const userRole = await getWorkspaceMemberRole(workspaceId, session.user.email);
  if (!userRole) {
    throw new Error('You are not a member of this workspace');
  }

  // Check role permission
  let hasPermission = false;
  if (Array.isArray(requiredRole)) {
    hasPermission = isRoleAllowed(userRole, requiredRole);
  } else {
    hasPermission = hasMinimumRole(userRole, requiredRole);
  }

  if (!hasPermission) {
    throw new Error(`Insufficient permissions. Required role: ${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}`);
  }

  return { workspaceId, userRole };
};

/**
 * Permission checkers for specific actions
 */
export const PERMISSIONS = {
  // Read-only actions
  VIEW: ['READONLY', 'FINANCE', 'TECHNICIAN', 'OPERATOR', 'MEMBER', 'ADMIN', 'OWNER', 'SUPER_ADMIN'],
  
  // Edit actions (no delete)
  EDIT: ['TECHNICIAN', 'OPERATOR', 'MEMBER', 'ADMIN', 'OWNER', 'SUPER_ADMIN'],
  
  // Delete actions
  DELETE: ['ADMIN', 'OWNER', 'SUPER_ADMIN'],
  
  // Full admin actions
  ADMIN: ['ADMIN', 'OWNER', 'SUPER_ADMIN'],

  // Finance actions (issue/mark-paid/cancel/preview/commit payouts)
  FINANCE: ['FINANCE', 'ADMIN', 'OWNER', 'SUPER_ADMIN'],
};
