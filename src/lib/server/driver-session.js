function parseCookieHeader(cookieHeader) {
  const out = {};
  const raw = String(cookieHeader || '');
  if (!raw) return out;
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function b64urlToUtf8(str) {
  const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Buffer.from(s + pad, 'base64').toString('utf8');
}

function tryParseSession(value) {
  const v = String(value || '');
  if (!v) return null;

  // JWT-like: header.payload.signature
  if (v.includes('.')) {
    const parts = v.split('.');
    if (parts.length >= 2) {
      try {
        return JSON.parse(b64urlToUtf8(parts[1]));
      } catch {}
    }
  }

  // base64url JSON
  try {
    return JSON.parse(b64urlToUtf8(v));
  } catch {}

  // raw JSON
  try {
    return JSON.parse(decodeURIComponent(v));
  } catch {}

  return null;
}

export function isHttpsRequest(req) {
  try {
    const xfProto = req?.headers?.['x-forwarded-proto'];
    if (xfProto && String(xfProto).toLowerCase().includes('https')) return true;
    return Boolean(req?.socket?.encrypted);
  } catch {
    return false;
  }
}

export function getDriverSessionFromReq(req) {
  const cookies = parseCookieHeader(req?.headers?.cookie);
  const raw = cookies.driver_session || '';
  const session = tryParseSession(raw);
  return session || null;
}

export function setDriverSessionCookie(res, session, req) {
  const secure = isHttpsRequest(req);
  const payload = Buffer.from(JSON.stringify(session || {}), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const parts = [
    `driver_session=${payload}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    secure ? 'Secure' : '',
  ].filter(Boolean);

  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearDriverSessionCookie(res, req) {
  const secure = isHttpsRequest(req);
  const parts = [
    'driver_session=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secure ? 'Secure' : '',
  ].filter(Boolean);

  res.setHeader('Set-Cookie', parts.join('; '));
}

