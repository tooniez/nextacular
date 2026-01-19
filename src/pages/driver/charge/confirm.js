import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import fetcher from '@/lib/client/fetcher';
import api from '@/lib/common/api';
import toast from 'react-hot-toast';
import useDriverMe from '@/hooks/useDriverMe';
import { requireDriverAuthForCharging } from '@/lib/driver/auth-gate';

function fmtMoneyEUR(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(2)} €`;
}

export default function DriverChargeConfirmPage() {
  const router = useRouter();
  const { stationId, connectorId } = router.query;
  const { me } = useDriverMe(); // used only to gate "Avvia ricarica"

  const [accept, setAccept] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: stationsData } = useSWR('/api/driver/stations', fetcher, { revalidateOnFocus: false });
  const stations = stationsData?.data || [];

  const station = useMemo(() => {
    if (!stationId) return null;
    return stations.find((s) => String(s.id) === String(stationId)) || null;
  }, [stations, stationId]);

  const connector = useMemo(() => {
    if (!connectorId) return null;
    const cs = station?.connectors || [];
    return cs.find((c) => String(c.id) === String(connectorId)) || null;
  }, [station, connectorId]);

  const { data: reservationData } = useSWR(me ? '/api/driver/reservations' : null, fetcher, { revalidateOnFocus: false });
  const reservation = reservationData?.data || null;

  const disabled = !stationId || !connectorId || !station || !connector || !accept || isSubmitting;

  return (
    <DriverLayout>
      <Meta title="Conferma avvio ricarica - Area Conducente" />
      <div className="space-y-4">
        <Button className="bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={() => router.back()}>
          Indietro
        </Button>

        <Card>
          <Card.Body>
            <div className="text-xl font-bold">Conferma avvio ricarica</div>
            <div className="mt-2 text-gray-700">
              Stazione: <span className="font-semibold">{station?.name || '—'}</span>
            </div>
            <div className="text-sm text-gray-600">{station?.location || '—'}</div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Presa</div>
                <div className="font-semibold">
                  {connector?.connectorType || '—'} (#{connector?.connectorId ?? '—'})
                </div>
              </div>
              <div className="rounded-xl border bg-gray-50 px-3 py-2">
                <div className="text-gray-500">Potenza max</div>
                <div className="font-semibold">{connector?.maxPower ? `${Number(connector.maxPower).toFixed(0)} kW` : '—'}</div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {reservation ? (
          <Card>
            <Card.Body>
              <div className="font-semibold">Prenotazione</div>
              <div className="text-sm text-gray-700 mt-1">
                Attiva fino a:{' '}
                <span className="font-semibold">
                  {reservation?.reservedUntil ? new Date(reservation.reservedUntil).toLocaleTimeString('it-IT') : '—'}
                </span>
              </div>
              <div className="text-sm text-gray-700">
                Costo prenotazione: <span className="font-semibold">{fmtMoneyEUR((reservation.feeCents || 0) / 100)}</span>
              </div>
            </Card.Body>
          </Card>
        ) : null}

        <Card>
          <Card.Body>
            <div className="font-semibold">Prima di iniziare</div>
            <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
              <li>Seleziona la presa corretta sulla colonnina.</li>
              <li>Collega il connettore al veicolo.</li>
              <li>Quando sei pronto, avvia la ricarica dall’app.</li>
            </ul>

            <label className="mt-4 flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-800">
                Ho letto e accetto i <span className="font-semibold">termini</span> e la policy di ricarica (penali in caso di uso scorretto).
              </span>
            </label>

            <div className="mt-4">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:hover:bg-blue-600"
                disabled={disabled}
                onClick={async () => {
                  if (!stationId || !connectorId) return;

                  const ok = requireDriverAuthForCharging({
                    router,
                    isAuthenticated: Boolean(me),
                    stationId: String(stationId),
                    connectorId: String(connectorId),
                    returnUrl: router.asPath,
                  });
                  if (!ok) {
                    toast('Per avviare una ricarica è necessario accedere.');
                    return;
                  }

                  setIsSubmitting(true);
                  try {
                    const resp = await api('/api/driver/sessions', {
                      method: 'POST',
                      body: { stationId: String(stationId), connectorId: String(connectorId) },
                    });
                    if (resp?.errors) {
                      Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                      return;
                    }
                    const sid = resp?.data?.id;
                    if (!sid) {
                      toast.error('Sessione non creata');
                      return;
                    }
                    toast.success('Ricarica avviata');
                    router.replace(`/driver/charging?sessionId=${encodeURIComponent(sid)}`);
                  } catch (e) {
                    toast.error(e?.message || 'Errore avvio ricarica');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                Avvia ricarica
              </Button>
            </div>
          </Card.Body>
        </Card>
      </div>
    </DriverLayout>
  );
}

