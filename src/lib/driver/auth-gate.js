export const DRIVER_CHARGING_INTENT_KEY = 'driver_charging_intent_v1';

function agentLog(hypothesisId, location, message, data) {
  try {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-auth-gate',
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  } catch {}
}

export function saveDriverChargingIntent(intent) {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      v: 1,
      ts: Date.now(),
      stationId: intent?.stationId ? String(intent.stationId) : null,
      connectorId: intent?.connectorId ? String(intent.connectorId) : null,
      returnUrl: intent?.returnUrl ? String(intent.returnUrl) : null,
    };
    window.localStorage.setItem(DRIVER_CHARGING_INTENT_KEY, JSON.stringify(payload));
    // #region agent log
    agentLog('G1', 'src/lib/driver/auth-gate.js', 'save charging intent', {
      hasStationId: Boolean(payload.stationId),
      hasConnectorId: Boolean(payload.connectorId),
      returnUrlPrefix: payload.returnUrl ? payload.returnUrl.slice(0, 60) : null,
    });
    // #endregion
  } catch {}
}

export function readDriverChargingIntent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(DRIVER_CHARGING_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDriverChargingIntent() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(DRIVER_CHARGING_INTENT_KEY);
    // #region agent log
    agentLog('G2', 'src/lib/driver/auth-gate.js', 'clear charging intent', {});
    // #endregion
  } catch {}
}

/**
 * Hard gate for "charging-impacting" actions.
 * Returns true if caller can proceed, otherwise redirects to /auth/login and returns false.
 */
export function requireDriverAuthForCharging({ router, isAuthenticated, stationId, connectorId, returnUrl }) {
  const authed = Boolean(isAuthenticated);
  const ru = returnUrl || (router?.asPath ? String(router.asPath) : '/driver/map');

  // #region agent log
  agentLog('G3', 'src/lib/driver/auth-gate.js', 'require auth for charging', {
    authed,
    hasStationId: Boolean(stationId),
    hasConnectorId: Boolean(connectorId),
    returnUrlPrefix: ru ? String(ru).slice(0, 60) : null,
  });
  // #endregion

  if (authed) return true;

  saveDriverChargingIntent({ stationId, connectorId, returnUrl: ru });
  const dest = `/auth/login?callbackUrl=${encodeURIComponent(String(ru))}`;
  try {
    if (router?.push) router.push(dest);
  } catch {}
  return false;
}

