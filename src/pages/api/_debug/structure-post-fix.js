import fs from 'fs/promises';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ errors: { error: { msg: `${req.method} method unsupported` } } });
  }

  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'docs',
        hypothesisId: 'DOC_DL_1',
        location: 'src/pages/api/_debug/structure-post-fix.js',
        message: 'download requested',
        data: { url: String(req?.url || '').slice(0, 200) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  try {
    const path = '/opt/nextacular/STRUCTURE_POST_FIX.md';
    const content = await fs.readFile(path, 'utf8');

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="STRUCTURE_POST_FIX.md"');
    return res.status(200).send(content);
  } catch (e) {
    // #region agent log
    try {
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'docs',
          hypothesisId: 'DOC_DL_2',
          location: 'src/pages/api/_debug/structure-post-fix.js',
          message: 'download failed',
          data: { err: e?.message ? String(e.message).slice(0, 200) : 'unknown' },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion
    return res.status(500).json({ errors: { error: { msg: 'Failed to read STRUCTURE_POST_FIX.md' } } });
  }
}

