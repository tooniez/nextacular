/**
 * Geocoding search proxy (Nominatim OpenStreetMap).
 * GET /api/geo/search?q=... -> { data: [{ displayName, lat, lon }] }
 *
 * Note: keep usage light; Nominatim has strict usage policies.
 */

function safeStr(s, max = 120) {
  return String(s || '').slice(0, max);
}

export default async function handler(req, res) {
  const { method } = req;
  if (method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const q = safeStr(req.query?.q, 160).trim();
  if (!q || q.length < 3) {
    return res.status(200).json({ data: [] });
  }

  // #region agent log
  fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'driver-map',
      hypothesisId: 'S_API_1',
      location: 'api/geo/search.js',
      message: 'geo search query',
      data: { qLen: q.length },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'json');
    url.searchParams.set('q', q);
    url.searchParams.set('limit', '6');
    url.searchParams.set('addressdetails', '0');
    url.searchParams.set('accept-language', 'it');

    const r = await fetch(url.toString(), {
      headers: {
        // Minimal UA/contact to behave nicely (Nominatim policy friendly)
        'User-Agent': 'MSolutionEV/1.0 (driver-app)',
        'Accept': 'application/json',
      },
    });
    const json = await r.json().catch(() => []);
    const out = Array.isArray(json)
      ? json
          .map((x) => ({
            displayName: safeStr(x?.display_name, 160),
            lat: Number(x?.lat),
            lon: Number(x?.lon),
          }))
          .filter((x) => x.displayName && Number.isFinite(x.lat) && Number.isFinite(x.lon))
      : [];

    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-map',
        hypothesisId: 'S_API_2',
        location: 'api/geo/search.js',
        message: 'geo search result',
        data: { count: out.length, status: r.status },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return res.status(200).json({ data: out });
  } catch (e) {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-map',
        hypothesisId: 'S_API_3',
        location: 'api/geo/search.js',
        message: 'geo search error',
        data: { error: e?.message || String(e) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return res.status(200).json({ data: [] });
  }
}

