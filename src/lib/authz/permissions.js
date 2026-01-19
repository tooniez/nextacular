import { TeamRole } from '@prisma/client';

/**
 * Permission model (string enum).
 * Keep it small + composable. Use these in both UI gating and API checks.
 */
export const Permission = Object.freeze({
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',
  STATIONS_VIEW: 'STATIONS_VIEW',
  STATIONS_EDIT: 'STATIONS_EDIT',
  SESSIONS_VIEW: 'SESSIONS_VIEW',
  PAYOUTS_VIEW: 'PAYOUTS_VIEW',
  PAYOUTS_MANAGE: 'PAYOUTS_MANAGE',
  SETTINGS_VIEW: 'SETTINGS_VIEW',
  SETTINGS_EDIT: 'SETTINGS_EDIT',
  TECH_OPS: 'TECH_OPS',
  USERS_MANAGE: 'USERS_MANAGE',
});

export function permissionsForWorkspaceRole(role) {
  // SUPER_ADMIN bypasses (handled separately), but we still give a full set.
  switch (role) {
    case TeamRole.READONLY:
      return [Permission.DASHBOARD_VIEW, Permission.STATIONS_VIEW, Permission.SESSIONS_VIEW, Permission.PAYOUTS_VIEW, Permission.SETTINGS_VIEW];
    case TeamRole.FINANCE:
      return [
        Permission.DASHBOARD_VIEW,
        Permission.STATIONS_VIEW,
        Permission.SESSIONS_VIEW,
        Permission.PAYOUTS_VIEW,
        Permission.PAYOUTS_MANAGE,
        Permission.SETTINGS_VIEW,
      ];
    case TeamRole.TECHNICIAN:
    case TeamRole.OPERATOR:
      return [
        Permission.DASHBOARD_VIEW,
        Permission.STATIONS_VIEW,
        Permission.STATIONS_EDIT,
        Permission.SESSIONS_VIEW,
        Permission.SETTINGS_VIEW,
        Permission.TECH_OPS,
      ];
    case TeamRole.MEMBER:
      return [
        Permission.DASHBOARD_VIEW,
        Permission.STATIONS_VIEW,
        Permission.STATIONS_EDIT,
        Permission.SESSIONS_VIEW,
        Permission.PAYOUTS_VIEW,
        Permission.SETTINGS_VIEW,
      ];
    case TeamRole.ADMIN:
    case TeamRole.OWNER:
      return [
        Permission.DASHBOARD_VIEW,
        Permission.STATIONS_VIEW,
        Permission.STATIONS_EDIT,
        Permission.SESSIONS_VIEW,
        Permission.PAYOUTS_VIEW,
        Permission.PAYOUTS_MANAGE,
        Permission.SETTINGS_VIEW,
        Permission.SETTINGS_EDIT,
        Permission.USERS_MANAGE,
        Permission.TECH_OPS,
      ];
    case TeamRole.SUPER_ADMIN:
      return Object.values(Permission);
    default:
      return [];
  }
}

export function hasPermission(permissions, perm) {
  if (!perm) return true;
  return Array.isArray(permissions) && permissions.includes(perm);
}

