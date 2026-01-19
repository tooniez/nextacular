import NextAuth from 'next-auth';
import { authOptions } from '@/lib/server/auth';

export default async function auth(req, res) {
  // Derive the external URL from reverse-proxy headers to avoid wrong callback-url cookie (port 3000).
  const xfProtoRaw = req?.headers?.['x-forwarded-proto'];
  const xfHostRaw = req?.headers?.['x-forwarded-host'];
  const hostRaw = req?.headers?.host;
  const proto = Array.isArray(xfProtoRaw) ? xfProtoRaw[0] : xfProtoRaw;
  const xfHost = Array.isArray(xfHostRaw) ? xfHostRaw[0] : xfHostRaw;
  const host = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw;

  const externalProto = (proto || '').split(',')[0]?.trim() || 'http';
  const externalHost = (xfHost || host || '').split(',')[0]?.trim() || '';
  const computed = externalHost ? `${externalProto}://${externalHost}` : null;

  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'src/pages/api/auth/[...nextauth].js',
        message: 'derived external base url for next-auth',
        data: {
          externalProto: externalProto ? String(externalProto).slice(0, 10) : null,
          externalHost: externalHost ? String(externalHost).slice(0, 120) : null,
          computed: computed ? String(computed).slice(0, 140) : null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  if (computed) {
    process.env.NEXTAUTH_URL = computed;
    process.env.NEXTAUTH_URL_INTERNAL = computed;
  }

  return await NextAuth(req, res, authOptions);
}
