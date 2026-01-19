import { getPrincipalFromReq, getPostLoginRedirect, getMenuForPrincipal } from '@/lib/authz';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${req.method} method unsupported` } } });
  }

  try {
    let principal = null;
    try {
      principal = await getPrincipalFromReq(req, res);
    } catch (e) {
      // #region agent log
      try {
        fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'authz',
            hypothesisId: 'AUTHZ_ME_ERR',
            location: 'src/pages/api/authz/me.js',
            message: 'getPrincipalFromReq threw',
            data: { err: e?.message ? String(e.message).slice(0, 180) : 'unknown', url: String(req?.url || '').slice(0, 200) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      } catch {}
      // #endregion
      throw e;
    }
    const workspaceSlug = req.query?.workspaceSlug ? String(req.query.workspaceSlug) : null;
    const callbackUrl = req.query?.callbackUrl ? String(req.query.callbackUrl) : null;

    // #region agent log
    try {
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'authz',
          hypothesisId: 'AUTHZ_ME',
          location: 'src/pages/api/authz/me.js',
          message: 'authz me',
          data: {
            platformAuthed: Boolean(principal?.platform?.isAuthenticated),
            driverAuthed: Boolean(principal?.driver?.isAuthenticated),
            isSuperAdmin: Boolean(principal?.isSuperAdmin),
            workspacesCount: Array.isArray(principal?.workspaces) ? principal.workspaces.length : 0,
            workspaceSlug: workspaceSlug ? String(workspaceSlug).slice(0, 64) : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion

    const redirectTo = getPostLoginRedirect(principal, { callbackUrl });
    const menu = getMenuForPrincipal(principal, { workspaceSlug });

    // #region agent log
    try {
      const topNames = (Array.isArray(menu) ? menu : []).map((i) => String(i?.name || '')).slice(0, 25);
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'authz',
          hypothesisId: 'MENU_SUPERADMIN_1',
          location: 'src/pages/api/authz/me.js',
          message: 'menu snapshot',
          data: {
            count: Array.isArray(menu) ? menu.length : null,
            hasDriverArea: topNames.includes('Area Conducente'),
            hasDriverApp: topNames.includes('App Conducente'),
            redirectPrefix: redirectTo ? String(redirectTo).slice(0, 64) : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion

    return res.status(200).json({
      data: {
        principal,
        redirectTo,
        menu,
      },
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
          hypothesisId: 'AUTHZ_ME_500',
          location: 'src/pages/api/authz/me.js',
          message: 'authz/me 500',
          data: { err: e?.message ? String(e.message).slice(0, 180) : 'unknown', url: String(req?.url || '').slice(0, 200) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion
    return res.status(500).json({ errors: { error: { msg: e?.message || 'Internal server error' } } });
  }
}

