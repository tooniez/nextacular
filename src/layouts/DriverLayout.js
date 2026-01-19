import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import BottomNav from '@/components/driver/BottomNav';
import useDriverMe from '@/hooks/useDriverMe';

export default function DriverLayout({
  children,
  title = 'Area Conducente',
  hideHeader = false,
  fullBleed = false,
  requireAuth = false,
}) {
  const router = useRouter();
  const { me, isLoading, isAuthError } = useDriverMe();

  useEffect(() => {
    if (!requireAuth) return;
    if (isLoading) return;
    if (!me || isAuthError) {
      const dest = `/auth/login?callbackUrl=${encodeURIComponent(String(router.asPath || '/driver/map'))}`;
      // #region agent log
      try {
        fetch('/api/_debug/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'driver-layout',
            hypothesisId: 'DL_REDIRECT_1',
            location: 'src/layouts/DriverLayout.js',
            message: 'requireAuth redirect to login',
            data: { asPath: String(router.asPath || ''), isLoading: Boolean(isLoading), hasMe: Boolean(me), isAuthError: Boolean(isAuthError), dest },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      } catch {}
      // #endregion
      router.replace(dest);
      // If router navigation is blocked, fall back to hard navigation.
      try {
        if (typeof window !== 'undefined' && window.location?.href) window.location.assign(dest);
      } catch {}
    }
  }, [requireAuth, isLoading, me, isAuthError, router]);

  useEffect(() => {
    if (!requireAuth) return;
    // #region agent log
    try {
      fetch('/api/_debug/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'driver-layout',
          hypothesisId: 'DL_STATE_1',
          location: 'src/layouts/DriverLayout.js',
          message: 'requireAuth state',
          data: { asPath: String(router.asPath || ''), isLoading: Boolean(isLoading), hasMe: Boolean(me), isAuthError: Boolean(isAuthError) },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
    // #endregion
  }, [requireAuth, router.asPath, isLoading, me, isAuthError]);

  if (requireAuth && isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-lg font-semibold">Caricamento…</div>
          <div className="text-sm text-gray-600 mt-2">Sto verificando la sessione.</div>
        </div>
      </main>
    );
  }
  if (requireAuth && !me) {
    const dest = `/auth/login?callbackUrl=${encodeURIComponent(String(router.asPath || '/driver/map'))}`;
    return (
      <main className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center">
          <div className="text-lg font-semibold">Accesso richiesto</div>
          <div className="text-sm text-gray-600 mt-2">Stai per essere reindirizzato al login.</div>
          <div className="mt-4">
            <Link className="text-blue-600 hover:underline text-sm" href={dest}>
              Vai al login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Toaster position="bottom-center" toastOptions={{ duration: 8000 }} />

      {!hideHeader && (
        <header className="bg-white border-b">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/driver" className="font-bold">
                {title}
              </Link>
              {me?.email ? (
                <span className="text-sm text-gray-500">{me.email}</span>
              ) : (
                <Link
                  className="text-sm text-blue-600 hover:underline"
                  href={`/auth/login?callbackUrl=${encodeURIComponent(String(router.asPath || '/driver/map'))}`}
                >
                  Accedi per avviare e pagare
                </Link>
              )}
            </div>

            <nav className="hidden md:flex gap-4 text-sm">
              <Link className="hover:underline" href="/driver/map">
                Mappa
              </Link>
              <Link className="hover:underline" href="/driver/activity">
                Attività
              </Link>
              <Link className="hover:underline" href="/driver/support">
                Assistenza
              </Link>
              <Link className="hover:underline" href="/driver/profile">
                Profilo
              </Link>
            </nav>
          </div>
        </header>
      )}

      <div className={`${fullBleed ? 'max-w-none px-0 py-0' : 'max-w-5xl mx-auto px-4 py-6'} pb-20 md:pb-6`}>
        {children}
      </div>

      <BottomNav />
    </main>
  );
}

