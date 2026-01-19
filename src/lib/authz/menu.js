import baseMenu from '@/config/menu/index';
import { Permission, hasPermission } from './permissions';

/**
 * Build menu items for the current principal.
 * This is the single source of truth the UI should use.
 *
 * Strategy (incremental refactor):
 * - Reuse existing config/menu builder
 * - Apply permission-based filtering here
 */
export function getMenuForPrincipal(principal, { workspaceSlug } = {}) {
  const isSuperAdmin = Boolean(principal?.isSuperAdmin);
  const explicitWsSlug = String(workspaceSlug || '').trim() || null;

  // IMPORTANT:
  // - Super Admin menu must be stable and stay in /admin/** by default.
  // - We only allow "tenant view" menu entries when workspaceSlug is explicitly provided by the current route.
  const wsSlug =
    isSuperAdmin ? null : explicitWsSlug || (principal?.workspaces || []).find((w) => w?.slug)?.slug || null;

  const menu = baseMenu(wsSlug ? { slug: wsSlug } : null, isSuperAdmin) || [];

  // Add explicit tenant view section for Super Admin only when a workspaceSlug is explicitly provided.
  // (This avoids "random" admin↔tenant context switches.)
  if (isSuperAdmin) {
    const out = Array.isArray(menu) ? [...menu] : [];
    if (explicitWsSlug) {
      const tenantMenu = baseMenu({ slug: explicitWsSlug }, false) || [];
      if (Array.isArray(tenantMenu) && tenantMenu.length > 0) {
        out.push({
          name: 'Vista organizzazione',
          icon: 'tenant',
          collapsible: true,
          defaultExpanded: false,
          menuItems: tenantMenu,
        });
      }
    }

    // #region agent log
    try {
      const top = out.map((i) => String(i?.name || '')).slice(0, 30);
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'menu',
          hypothesisId: 'MENU_SA_1',
          location: 'src/lib/authz/menu.js',
          message: 'superadmin menu built',
          data: {
            explicitWs: Boolean(explicitWsSlug),
            count: out.length,
            hasTenantGroup: top.includes('Vista organizzazione'),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion

    return out;
  }

  // Determine effective permissions for this workspace (best-effort).
  const ws = (principal?.workspaces || []).find((w) => w?.slug === wsSlug) || (principal?.workspaces || [])[0] || null;
  const perms = ws?.permissions || [];

  const canSeeItem = (item) => {
    const req = item?.requiredPermission;
    const reqAll = item?.requiredPermissions;
    const reqAny = item?.requiredAnyPermissions;
    if (req && !hasPermission(perms, req)) return false;
    if (Array.isArray(reqAll) && reqAll.length > 0) {
      const ok = reqAll.every((p) => hasPermission(perms, p));
      if (!ok) return false;
    }
    if (Array.isArray(reqAny) && reqAny.length > 0) {
      const ok = reqAny.some((p) => hasPermission(perms, p));
      if (!ok) return false;
    }
    return true;
  };

  const filterMenuTree = (items) => {
    const arr = Array.isArray(items) ? items : [];
    const out = [];
    for (const item of arr) {
      if (!item) continue;
      // Groups: filter children and keep only if something remains AND group-level permission passes
      if (Array.isArray(item.menuItems)) {
        if (!canSeeItem(item)) continue;
        const kids = filterMenuTree(item.menuItems);
        if (kids.length === 0) continue;
        out.push({ ...item, menuItems: kids });
        continue;
      }
      // Leaf item
      if (!canSeeItem(item)) continue;
      out.push(item);
    }
    return out;
  };

  return filterMenuTree(menu || []);
}

