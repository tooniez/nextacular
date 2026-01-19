/**
 * Single source of truth for post-login redirect.
 *
 * Note: this app uses:
 * - Admin/Sub-CPO: /account/* and /admin/*
 * - Driver: /driver/*
 */

function isSafeInternalPath(p) {
  const s = String(p || '');
  return s.startsWith('/') && !s.startsWith('//') && !s.includes('://');
}

export function getPostLoginRedirect(principal, { callbackUrl } = {}) {
  const cb = isSafeInternalPath(callbackUrl) ? String(callbackUrl) : null;
  const cbClean = cb ? cb.split('#')[0] : null;
  const cbPath = cbClean ? cbClean.split('?')[0] : null;
  const isGenericAccountRoot = cbPath === '/account' || cbPath === '/admin';

  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'authz-redirect',
        hypothesisId: 'R1',
        location: 'src/lib/authz/redirects.js',
        message: 'getPostLoginRedirect input',
        data: {
          cbPath: cbPath ? String(cbPath).slice(0, 120) : null,
          isGenericAccountRoot: Boolean(isGenericAccountRoot),
          platformAuthed: Boolean(principal?.platform?.isAuthenticated),
          driverAuthed: Boolean(principal?.driver?.isAuthenticated),
          isSuperAdmin: Boolean(principal?.isSuperAdmin),
          workspacesCount: Array.isArray(principal?.workspaces) ? principal.workspaces.length : 0,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  // If callbackUrl points to driver and we have driver session, honor it.
  if (cbClean && cbPath?.startsWith('/driver') && principal?.driver?.isAuthenticated) {
    return cbClean;
  }
  // If callbackUrl points to admin and we have platform session, honor it.
  // But treat '/account' (root) as generic: for Sub-CPO we want a specific workspace landing.
  if (
    cbClean &&
    !isGenericAccountRoot &&
    (cbPath?.startsWith('/account') || cbPath?.startsWith('/admin')) &&
    principal?.platform?.isAuthenticated
  ) {
    return cbClean;
  }

  // Priority: SUPER_ADMIN > platform workspace roles > driver
  if (principal?.isSuperAdmin && principal?.platform?.isAuthenticated) {
    return '/admin/dashboard';
  }

  if (principal?.platform?.isAuthenticated) {
    const ws = Array.isArray(principal.workspaces) ? principal.workspaces.find((w) => w?.slug) : null;
    // Prefer landing at workspace root (matches expected: /account/<workspaceSlug>)
    if (ws?.slug) return `/account/${ws.slug}`;
    return '/account';
  }

  if (principal?.driver?.isAuthenticated) {
    return '/driver/map';
  }

  return '/auth/login';
}

