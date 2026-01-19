export default async function api(url, opts = {}) {
  const { body, headers, credentials, ...rest } = opts || {};
  const hasBody = body !== undefined && body !== null;

  const resp = await fetch(url, {
    ...rest,
    credentials: credentials ?? 'same-origin',
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(headers || {}),
    },
    ...(rest?.method && String(rest.method).toUpperCase() === 'GET' ? {} : { body: hasBody ? JSON.stringify(body) : undefined }),
  });

  const json = await resp.json().catch(() => ({}));
  // #region agent log
  try {
    const hasSessionUnauthorized =
      Boolean(json?.errors?.session?.msg) &&
      String(json.errors.session.msg).toLowerCase().includes('unauthorized');
    if (resp.status === 401 || hasSessionUnauthorized) {
      fetch('/api/_debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'api-client',
          hypothesisId: 'API_401',
          location: 'src/lib/common/api.js',
          message: 'api() got unauthorized',
          data: {
            url: String(url || '').slice(0, 200),
            method: String(rest?.method || 'GET').toUpperCase(),
            status: resp.status,
            hasErrors: Boolean(json?.errors),
            hasSessionErr: Boolean(json?.errors?.session),
            sessionMsg: json?.errors?.session?.msg ? String(json.errors.session.msg).slice(0, 80) : null,
            path: typeof window !== 'undefined' ? String(window.location?.pathname || '') : null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
  } catch {}
  // #endregion
  return { status: resp.status, ...json, url };
}

