/**
 * Debug log ingestion (server-side forwarder).
 *
 * Client calls this endpoint; server forwards to the local debug ingest.
 * This is temporary instrumentation to troubleshoot the live VPS runtime.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: 'Method unsupported' } } });
  }

  try {
    const b = req.body || {};
    const payload = {
      sessionId: 'debug-session',
      runId: String(b.runId || 'run1').slice(0, 64),
      hypothesisId: String(b.hypothesisId || 'X').slice(0, 16),
      location: String(b.location || 'unknown').slice(0, 120),
      message: String(b.message || '').slice(0, 200),
      data: typeof b.data === 'object' && b.data ? b.data : {},
      timestamp: Number.isFinite(Number(b.timestamp)) ? Number(b.timestamp) : Date.now(),
    };

    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
    // #endregion

    return res.status(204).end();
  } catch (e) {
    return res.status(200).json({ ok: false });
  }
}

