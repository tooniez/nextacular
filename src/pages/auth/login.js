import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { signIn, signOut, getCsrfToken } from 'next-auth/react';
import { getServerSession } from 'next-auth/next';
import toast from 'react-hot-toast';

import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { authOptions } from '@/lib/server/auth';
import { getDriverSessionFromReq } from '@/lib/server/driver-session';

function dbg(hypothesisId, location, message, data) {
  try {
    // #region agent log
    fetch('/api/_debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runId: 'admin-auth', hypothesisId, location, message, data, timestamp: Date.now() }),
    }).catch(() => {});
    // #endregion
  } catch {}
}

export default function AuthLoginPage({
  csrfToken,
  alreadyAuthenticated,
  currentUserEmailPrefix,
  currentUserEmailDomain,
  hasDriverSession,
  driverEmailPrefix,
  driverEmailDomain,
}) {
  const router = useRouter();
  const callbackUrl = useMemo(() => String(router.query?.callbackUrl || '/account'), [router.query]);

  const [mode, setMode] = useState('password'); // password | email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    dbg('A_LOGIN_1', 'pages/auth/login.js', 'login page mounted', {
      proto: typeof window !== 'undefined' ? String(window.location?.protocol || '') : '',
      secure: typeof window !== 'undefined' ? Boolean(window.isSecureContext) : null,
      alreadyAuthenticated: Boolean(alreadyAuthenticated),
      currentUserEmailPrefix: currentUserEmailPrefix || null,
      currentUserEmailDomain: currentUserEmailDomain || null,
      hasDriverSession: Boolean(hasDriverSession),
      driverEmailPrefix: driverEmailPrefix || null,
      driverEmailDomain: driverEmailDomain || null,
    });
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Meta title="Accedi - Piattaforma" />

      <div className="max-w-md mx-auto px-4 py-10">
        <div className="mb-6">
          <div className="text-2xl font-bold">Accedi</div>
          <div className="text-sm text-gray-600">Area piattaforma (Sub‑CPO / Super Admin)</div>
        </div>

        {(alreadyAuthenticated || hasDriverSession) && (
          <Card>
            <Card.Body>
              <div className="text-sm text-gray-700">
                {alreadyAuthenticated ? (
                  <>
                    Sei già autenticato (Admin) come{' '}
                    <span className="font-semibold">{currentUserEmailPrefix}@{currentUserEmailDomain}</span>.
                  </>
                ) : (
                  <>Non risulti autenticato (Admin).</>
                )}
                {hasDriverSession ? (
                  <>
                    {' '}
                    Sei anche autenticato (Conducente) come{' '}
                    <span className="font-semibold">{driverEmailPrefix}@{driverEmailDomain}</span>.
                  </>
                ) : (
                  <> Non risulti autenticato (Conducente).</>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  className="bg-gray-900 text-white hover:bg-gray-800"
                  onClick={() => {
                    dbg('A_LOGIN_0', 'pages/auth/login.js', 'signOut for account switch', {});
                    try {
                      // Clear possible Driver session too (unified login UX)
                      fetch('/api/driver/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
                    } catch {}
                    signOut({ callbackUrl: '/auth/login' }).catch(() => {});
                  }}
                >
                  Disconnetti e cambia account
                </Button>
                {hasDriverSession && !alreadyAuthenticated && (
                  <Button
                    className="border border-gray-300"
                    onClick={() => {
                      dbg('A_LOGIN_D0', 'pages/auth/login.js', 'driver-only logout', {});
                      fetch('/api/driver/auth/logout', { method: 'POST', credentials: 'same-origin' })
                        .then(() => router.replace('/auth/login'))
                        .catch(() => router.replace('/auth/login'));
                    }}
                  >
                    Disconnetti conducente
                  </Button>
                )}
                <Button
                  className="border border-gray-300"
                  onClick={() => router.replace('/account')}
                >
                  Vai all’account
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        <Card>
          <Card.Body>
            <div className="flex gap-2">
              <button
                type="button"
                className={[
                  'flex-1 rounded-xl border px-3 py-2 text-sm font-semibold',
                  mode === 'password' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-900',
                ].join(' ')}
                onClick={() => setMode('password')}
              >
                Email + Password
              </button>
              <button
                type="button"
                className={[
                  'flex-1 rounded-xl border px-3 py-2 text-sm font-semibold',
                  mode === 'email' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-900',
                ].join(' ')}
                onClick={() => setMode('email')}
              >
                Magic link
              </button>
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const em = String(email || '').trim().toLowerCase();
                if (!em) return toast.error('Email obbligatoria');
                setBusy(true);

                try {
                  if (mode !== 'password') {
                    dbg('A_LOGIN_3', 'pages/auth/login.js', 'email submit', { hasEmail: true });
                    await signIn('email', { email: em, callbackUrl });
                    return;
                  }

                  if (!password) return toast.error('Password obbligatoria');

                  // Unified flow:
                  // 1) Try platform/admin login (NextAuth credentials)
                  dbg('A_UNI_1', 'pages/auth/login.js', 'try platform login', { emailPrefix: em.slice(0, 3) });
                  const r = await signIn('credentials', {
                    redirect: false,
                    email: em,
                    password,
                    callbackUrl,
                    csrfToken,
                  });
                  dbg('A_UNI_2', 'pages/auth/login.js', 'platform login result', {
                    ok: Boolean(r && !r.error),
                    hasError: Boolean(r?.error),
                    error: r?.error ? String(r.error).slice(0, 60) : null,
                  });

                  if (!r?.error) {
                    // Platform login succeeded. Clear possible Driver session cookie (avoid mixed state).
                    fetch('/api/driver/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});

                    // Single source of truth: ask authz for redirect decision.
                    let dest = callbackUrl || '/account';
                    try {
                      const azRes = await fetch(`/api/authz/me?callbackUrl=${encodeURIComponent(String(callbackUrl || ''))}`, {
                        credentials: 'include',
                      });
                      const azJson = await azRes.json().catch(() => ({}));
                      const redirectTo = azJson?.data?.redirectTo;
                      dbg('A_UNI_5', 'pages/auth/login.js', 'authz/me after login', {
                        status: azRes.status,
                        hasRedirect: Boolean(redirectTo),
                        redirectPrefix: redirectTo ? String(redirectTo).slice(0, 24) : null,
                      });
                      if (azRes.status === 200 && redirectTo) dest = String(redirectTo);
                    } catch {}

                    toast.success('Accesso effettuato');
                    router.replace(dest);
                    return;
                  }

                  // 2) If platform login fails, try Driver login (EndUser)
                  dbg('A_UNI_3', 'pages/auth/login.js', 'try driver login', { emailPrefix: em.slice(0, 3) });
                  const dRes = await fetch('/api/driver/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: em, password }),
                    credentials: 'same-origin',
                  });
                  const dJson = await dRes.json().catch(() => ({}));
                  dbg('A_UNI_4', 'pages/auth/login.js', 'driver login result', {
                    status: dRes.status,
                    ok: dRes.status === 200,
                    hasErrors: Boolean(dJson?.errors),
                  });

                  if (dRes.status === 200) {
                    toast.success('Accesso effettuato');
                    // Use centralized redirect decision (honors callbackUrl like /driver/charge/confirm?...).
                    let dest = callbackUrl || '/driver/map';
                    try {
                      const azRes = await fetch(`/api/authz/me?callbackUrl=${encodeURIComponent(String(callbackUrl || ''))}`, {
                        credentials: 'include',
                      });
                      const azJson = await azRes.json().catch(() => ({}));
                      const redirectTo = azJson?.data?.redirectTo;
                      dbg('A_UNI_6', 'pages/auth/login.js', 'authz/me after driver login', {
                        status: azRes.status,
                        hasRedirect: Boolean(redirectTo),
                        redirectPrefix: redirectTo ? String(redirectTo).slice(0, 24) : null,
                      });
                      if (azRes.status === 200 && redirectTo) dest = String(redirectTo);
                    } catch {}
                    window.location.href = dest;
                    return;
                  }

                  toast.error('Credenziali non valide');
                } catch (err) {
                  toast.error(err?.message || 'Errore login');
                } finally {
                  setBusy(false);
                }
              }}
            >
              <input type="hidden" name="csrfToken" defaultValue={csrfToken || ''} />

              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@azienda.it"
                />
              </div>

              {mode === 'password' ? (
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input
                    className="w-full px-3 py-2 border rounded"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  Ti invieremo un link di accesso via email (se la posta è configurata).
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                disabled={busy}
                onClick={() => dbg('A_LOGIN_CLICK', 'pages/auth/login.js', 'login button clicked', { mode })}
              >
                {busy ? 'Attendi…' : 'Accedi'}
              </Button>

              <div className="text-xs text-gray-500">
                Sei un conducente? Vai su{' '}
                <Link className="text-blue-600 hover:underline" href="/driver/login">
                  Area Conducente
                </Link>
                .
              </div>
            </form>
          </Card.Body>
        </Card>
      </div>
    </main>
  );
}

export async function getServerSideProps(ctx) {
  // Ensure NextAuth helpers (getServerSession/getCsrfToken) use the correct external URL
  // (otherwise next-auth.callback-url may point to :3000 and the browser gets redirected to a 500).
  const xfProtoRaw = ctx?.req?.headers?.['x-forwarded-proto'];
  const xfHostRaw = ctx?.req?.headers?.['x-forwarded-host'];
  const hostRaw = ctx?.req?.headers?.host;
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
        hypothesisId: 'H2',
        location: 'pages/auth/login.js:getServerSideProps',
        message: 'set NEXTAUTH_URL from forwarded headers',
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

  const session = await getServerSession(ctx.req, ctx.res, authOptions);
  const driverSession = getDriverSessionFromReq(ctx.req);

  // If already authenticated (platform or driver), do a server-side redirect to the right area.
  // This avoids showing the login page (and avoids "white page" if JS/assets fail to load).
  if (session?.user || driverSession?.endUserId) {
    try {
      const { getPrincipalFromReq, getPostLoginRedirect } = await import('@/lib/authz');
      const principal = await getPrincipalFromReq(ctx.req, ctx.res);
      const callbackUrl = ctx?.query?.callbackUrl ? String(ctx.query.callbackUrl) : null;
      const redirectTo = getPostLoginRedirect(principal, { callbackUrl });

      // #region agent log
      try {
        fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'login-ssr',
            hypothesisId: 'L1',
            location: 'pages/auth/login.js:getServerSideProps',
            message: 'already authenticated -> redirect',
            data: {
              platformAuthed: Boolean(principal?.platform?.isAuthenticated),
              driverAuthed: Boolean(principal?.driver?.isAuthenticated),
              isSuperAdmin: Boolean(principal?.isSuperAdmin),
              workspacesCount: Array.isArray(principal?.workspaces) ? principal.workspaces.length : 0,
              redirectTo: redirectTo ? String(redirectTo).slice(0, 160) : null,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      } catch {}
      // #endregion

      if (redirectTo && redirectTo !== '/auth/login') {
        return {
          redirect: { destination: String(redirectTo), permanent: false },
        };
      }
    } catch (e) {
      // #region agent log
      try {
        fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'login-ssr',
            hypothesisId: 'L2',
            location: 'pages/auth/login.js:getServerSideProps',
            message: 'already authenticated redirect failed',
            data: { err: e?.message ? String(e.message).slice(0, 180) : 'unknown' },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      } catch {}
      // #endregion
    }
  }

  const csrfToken = await getCsrfToken(ctx);
  const email = String(session?.user?.email || '').trim().toLowerCase();
  const emailParts = email ? email.split('@') : [];
  const currentUserEmailPrefix = emailParts[0] ? String(emailParts[0]).slice(0, 3) : null;
  const currentUserEmailDomain = emailParts[1] ? String(emailParts[1]).slice(0, 64) : null;

  const driverEmail = String(driverSession?.email || '').trim().toLowerCase();
  const driverEmailParts = driverEmail ? driverEmail.split('@') : [];
  const driverEmailPrefix = driverEmailParts[0] ? String(driverEmailParts[0]).slice(0, 3) : null;
  const driverEmailDomain = driverEmailParts[1] ? String(driverEmailParts[1]).slice(0, 64) : null;

  return {
    props: {
      csrfToken: csrfToken || null,
      alreadyAuthenticated: Boolean(session?.user),
      currentUserEmailPrefix,
      currentUserEmailDomain,
      hasDriverSession: Boolean(driverSession?.endUserId),
      driverEmailPrefix,
      driverEmailDomain,
    },
  };
}

