import { useEffect } from 'react';
import Link from 'next/link';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import useDriverMe from '@/hooks/useDriverMe';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';

function Row({ href, title, subtitle }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50">
      <div className="min-w-0">
        <div className="font-semibold text-gray-900 truncate">{title}</div>
        {subtitle ? <div className="text-xs text-gray-600 truncate">{subtitle}</div> : null}
      </div>
      <div className="text-gray-400">›</div>
    </Link>
  );
}

export default function DriverProfileHomePage({ canBackToPlatform = false, platformBackHref = null }) {
  const { me, mutate } = useDriverMe();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // #region agent log
    fetch('/api/_debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'driver-profile',
        hypothesisId: 'P1',
        location: 'driver/profile/index.js',
        message: 'profile page mounted',
        data: { secure: Boolean(window.isSecureContext), proto: String(window.location?.protocol || '') },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  return (
    <DriverLayout requireAuth>
      <Meta title="Profilo - Area Conducente" />

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Profilo</h1>
            <div className="text-sm text-gray-600">{me?.email}</div>
          </div>
          {canBackToPlatform && platformBackHref ? (
            <Link className="text-sm text-blue-600 hover:underline mt-1" href={platformBackHref}>
              Torna alla dashboard
            </Link>
          ) : null}
        </div>

        <Card>
          <Card.Body className="p-0 divide-y">
            <Row href="/driver/profile/personal" title="Dati personali" subtitle="Nome, telefono" />
            <Row href="/driver/profile/payment-method" title="Metodo di pagamento" subtitle="Carta salvata" />
            <Row href="/driver/profile/billing" title="Fatturazione" subtitle="Dati fiscali e ricevute" />
            <Row href="/driver/profile/consents" title="Consensi" subtitle="Privacy e marketing" />
            <Row href="/driver/profile/favorites" title="Preferiti" subtitle="Le tue colonnine salvate" />
            <Row href="/driver/profile/settings" title="Impostazioni" subtitle="Preferenze app" />
          </Card.Body>
        </Card>

        <Card>
          <Card.Body>
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold">Wallet</div>
              <Link className="text-blue-600 hover:underline text-sm" href="/driver/wallet">
                Apri
              </Link>
            </div>
            <div className="text-xs text-gray-600 mt-1">Ricariche e saldo</div>
          </Card.Body>
        </Card>

        <Button
          className="w-full bg-gray-900 hover:bg-black text-white"
          onClick={async () => {
            try {
              const resp = await api('/api/driver/auth/logout', { method: 'POST', body: {} });
              if (resp?.errors) {
                Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                return;
              }
              toast.success('Logout effettuato');
              mutate();
              // #region agent log
              try {
                fetch('/api/_debug/log', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    runId: 'logout',
                    hypothesisId: 'LO2',
                    location: 'pages/driver/profile/index.js',
                    message: 'driver logout success -> redirect',
                    data: { dest: '/auth/login?callbackUrl=/driver/map' },
                    timestamp: Date.now(),
                  }),
                }).catch(() => {});
              } catch {}
              // #endregion

              // Always land on unified login page (with driver callback)
              window.location.replace('/auth/login?callbackUrl=/driver/map');
            } catch (e) {
              toast.error(e?.message || 'Errore logout');
            }
          }}
        >
          Logout
        </Button>
      </div>
    </DriverLayout>
  );
}

export async function getServerSideProps(context) {
  try {
    const { getPrincipalFromReq } = await import('@/lib/authz');
    const principal = await getPrincipalFromReq(context.req, context.res);

    const isSuperAdmin = Boolean(principal?.isSuperAdmin);
    const isPlatformAuthed = Boolean(principal?.platform?.isAuthenticated);
    const wsSlug = (principal?.workspaces || []).find((w) => w?.slug)?.slug || null;
    const canBackToPlatform = Boolean(isPlatformAuthed && (isSuperAdmin || wsSlug));
    const platformBackHref = canBackToPlatform
      ? isSuperAdmin
        ? '/account'
        : `/account/${String(wsSlug)}/dashboard`
      : null;

    // #region agent log
    await fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'driver-profile',
        hypothesisId: 'P_SSR_1',
        location: 'src/pages/driver/profile/index.js:getServerSideProps',
        message: 'ssr profile',
        data: {
          method: String(context?.req?.method || ''),
          url: String(context?.req?.url || ''),
          host: String(context?.req?.headers?.host || ''),
          hasCookie: Boolean(context?.req?.headers?.cookie),
          referer: context?.req?.headers?.referer ? String(context.req.headers.referer).slice(0, 120) : null,
          platformAuthed: isPlatformAuthed,
          isSuperAdmin,
          hasWorkspaceSlug: Boolean(wsSlug),
          canBackToPlatform,
          platformBackHref,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    return {
      props: {
        platformBackHref: platformBackHref || null,
        canBackToPlatform: Boolean(canBackToPlatform),
      },
    };
  } catch {}

  return { props: { platformBackHref: null, canBackToPlatform: false } };
}

