import { useMemo } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import fetcher from '@/lib/client/fetcher';
import Link from 'next/link';

function fmtTime(d) {
  try {
    return new Date(d).toLocaleString('it-IT');
  } catch {
    return '—';
  }
}

export default function DriverChargingPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const { data: currentData } = useSWR('/api/driver/sessions/current', fetcher, { revalidateOnFocus: false });
  const current = currentData?.data || null;

  const { data: byIdData } = useSWR(sessionId ? `/api/driver/sessions/${sessionId}` : null, fetcher, { revalidateOnFocus: false });
  const byId = byIdData?.data || null;

  const s = useMemo(() => current || byId || null, [current, byId]);

  return (
    <DriverLayout requireAuth>
      <Meta title="Ricarica in corso - Area Conducente" />
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-bold">Ricarica in corso</div>
            <div className="text-sm text-gray-600">Monitora e termina in sicurezza</div>
          </div>
          <Button className="bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={() => router.push('/driver/map')}>
            Mappa
          </Button>
        </div>

        <Card>
          <Card.Body>
            <div className="font-semibold">{s?.station?.name || '—'}</div>
            <div className="text-sm text-gray-600">{s?.station?.location || '—'}</div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Inizio</div>
                <div className="font-semibold">{s?.startTime ? fmtTime(s.startTime) : '—'}</div>
              </div>
              <div className="rounded-xl border bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Stato</div>
                <div className="font-semibold">{s?.status || '—'}</div>
              </div>
              <div className="rounded-xl border bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Presa</div>
                <div className="font-semibold">
                  {s?.connector?.connectorType || '—'} (#{s?.connector?.connectorId ?? '—'})
                </div>
              </div>
              <div className="rounded-xl border bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Potenza max</div>
                <div className="font-semibold">{s?.connector?.maxPower ? `${Number(s.connector.maxPower).toFixed(0)} kW` : '—'}</div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-700">
              Per terminare: <span className="font-semibold">scollega il connettore</span> e poi conferma dall’app.
            </div>

            <div className="mt-4 space-y-2">
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  const sid = s?.id || sessionId;
                  if (!sid) return;
                  router.push(`/driver/charge/stop?sessionId=${encodeURIComponent(String(sid))}`);
                }}
              >
                Termina ricarica
              </Button>

              {s?.id ? (
                <div className="text-xs text-gray-600">
                  Dettaglio sessione:{' '}
                  <Link className="text-blue-600 hover:underline" href={`/driver/sessions/${s.id}`}>
                    Apri
                  </Link>
                </div>
              ) : null}
            </div>
          </Card.Body>
        </Card>
      </div>
    </DriverLayout>
  );
}

