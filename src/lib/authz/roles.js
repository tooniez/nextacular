import { TeamRole } from '@prisma/client';

/**
 * Global roles (cross-tenant).
 * NOTE: today "Super Admin" is represented via Member.teamRole = SUPER_ADMIN
 * (and/or SUPER_ADMIN_EMAILS allowlist). We normalize it here.
 */
export const GlobalRole = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  NONE: 'NONE',
});

/**
 * Workspace-scoped roles (tenant boundary).
 * Mirrors Prisma enum TeamRole.
 */
export const WorkspaceRole = TeamRole;

// Lowest -> Highest. SUPER_ADMIN is treated as highest.
export const WORKSPACE_ROLE_LEVEL = Object.freeze({
  [TeamRole.READONLY]: 1,
  [TeamRole.FINANCE]: 1,
  [TeamRole.TECHNICIAN]: 2,
  [TeamRole.OPERATOR]: 2,
  [TeamRole.MEMBER]: 3,
  [TeamRole.ADMIN]: 4,
  [TeamRole.OWNER]: 5,
  [TeamRole.SUPER_ADMIN]: 6,
});

export function isWorkspaceRoleAtLeast(userRole, minRole) {
  if (!userRole || !minRole) return false;
  return (WORKSPACE_ROLE_LEVEL[userRole] || 0) >= (WORKSPACE_ROLE_LEVEL[minRole] || 0);
}

export function isWorkspaceRoleOneOf(userRole, allowedRoles = []) {
  if (!userRole) return false;
  return Array.isArray(allowedRoles) && allowedRoles.includes(userRole);
}

