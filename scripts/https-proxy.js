/**
 * Simple HTTPS reverse proxy for the Next.js app (supports WebSocket upgrade).
 *
 * Usage:
 *   PORT=3443 TARGET_PORT=3002 node scripts/https-proxy.js
 *
 * Requires cert files:
 *   certs/dev-ip.key
 *   certs/dev-ip.crt
 */
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');

const PORT = Number(process.env.PORT || 3443);
const TARGET_HOST = process.env.TARGET_HOST || '127.0.0.1';
const TARGET_PORT = Number(process.env.TARGET_PORT || 3002);

const keyPath = process.env.TLS_KEY || path.join(__dirname, '..', 'certs', 'dev-ip.key');
const crtPath = process.env.TLS_CERT || path.join(__dirname, '..', 'certs', 'dev-ip.crt');

const tls = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(crtPath),
};

let connCount = 0;
let reqCount = 0;
let tlsErrCount = 0;
let clientErrCount = 0;

function agentLog(hypothesisId, message, data) {
  try {
    // Node 20 has fetch
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'https-proxy',
        hypothesisId,
        location: 'scripts/https-proxy.js',
        message,
        data,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
}

function proxyRequest(req, res) {
  const origHost = req.headers?.host ? String(req.headers.host) : null;
  const origUrl = req.url ? String(req.url) : '';
  const headers = { ...req.headers };
  headers['x-forwarded-proto'] = 'https';
  headers['x-forwarded-host'] = headers.host;
  headers.host = `${TARGET_HOST}:${TARGET_PORT}`;

  // Prevent client aborts from crashing the process
  try {
    req.on('error', () => {});
    res.on('error', () => {});
  } catch {}

  reqCount += 1;
  const urlStr = origUrl;
  const isAuthOrRbac = urlStr.startsWith('/api/auth') || urlStr.startsWith('/auth/') || urlStr.startsWith('/api/admin/me');
  const isNextPageChunk = urlStr.startsWith('/_next/static/chunks/pages/');
  const isDebugLog = urlStr.startsWith('/api/_debug/log');
  const isLoginLike = urlStr === '/login' || urlStr.startsWith('/login?');
  if (isDebugLog || isNextPageChunk || isLoginLike || isAuthOrRbac || reqCount <= 5 || reqCount % 25 === 0) {
    // #region agent log
    agentLog('PX_REQ', 'http request', {
      port: PORT,
      reqCount,
      connCount,
      tlsErrCount,
      clientErrCount,
      method: String(req.method || '').slice(0, 12),
      pathLen: urlStr.length,
      pathSample: urlStr.slice(0, 120),
      host: origHost ? origHost.slice(0, 120) : null,
    });
    // #endregion
  }

  const upstream = http.request(
    {
      host: TARGET_HOST,
      port: TARGET_PORT,
      method: req.method,
      path: req.url,
      headers,
    },
    (upRes) => {
      try {
        upRes.on('error', () => {});
      } catch {}

      // #region agent log
      const status = upRes.statusCode || null;
      if (isDebugLog || isNextPageChunk || isAuthOrRbac || isLoginLike || (typeof status === 'number' && status >= 400)) {
        agentLog(status >= 400 ? 'PX_UP_ERR' : 'PX_UP', 'upstream response', {
          port: PORT,
          reqCount,
          method: String(req.method || '').slice(0, 12),
          pathSample: urlStr.slice(0, 120),
          status,
          host: origHost ? origHost.slice(0, 120) : null,
        });
      }
      // #endregion

      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    }
  );

  upstream.on('error', () => {
    try {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('Bad gateway');
    } catch {}
  });

  req.pipe(upstream);
}

const server = https.createServer(tls, proxyRequest);

// Swallow TLS/client socket errors (e.g., ECONNRESET when user cancels)
server.on('tlsClientError', (_err, socket) => {
  tlsErrCount += 1;
  if (tlsErrCount <= 5 || tlsErrCount % 25 === 0) {
    // #region agent log
    agentLog('PX_TLSERR', 'tlsClientError', { port: PORT, reqCount, connCount, tlsErrCount, clientErrCount });
    // #endregion
  }
  try {
    socket.destroy();
  } catch {}
});
server.on('clientError', (_err, socket) => {
  clientErrCount += 1;
  if (clientErrCount <= 5 || clientErrCount % 25 === 0) {
    // #region agent log
    agentLog('PX_CERR', 'clientError', { port: PORT, reqCount, connCount, tlsErrCount, clientErrCount });
    // #endregion
  }
  try {
    socket.destroy();
  } catch {}
});
server.on('connection', (socket) => {
  connCount += 1;
  if (connCount <= 5 || connCount % 25 === 0) {
    // #region agent log
    agentLog('PX_CONN', 'tcp connection', { port: PORT, reqCount, connCount, tlsErrCount, clientErrCount });
    // #endregion
  }
  try {
    socket.on('error', () => {});
  } catch {}
});

server.on('upgrade', (req, socket, head) => {
  // Tunnel websocket upgrade to upstream
  try {
    socket.on('error', () => {});
  } catch {}
  const upstream = net.connect(TARGET_PORT, TARGET_HOST, () => {
    upstream.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
        Object.entries(req.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n'
    );
    if (head && head.length) upstream.write(head);
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  upstream.on('error', () => {
    try {
      socket.destroy();
    } catch {}
  });
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[https-proxy] listening on https://0.0.0.0:${PORT} -> http://${TARGET_HOST}:${TARGET_PORT}`);
});

