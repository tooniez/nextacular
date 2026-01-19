import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

export default function DriverStopChargePage() {
  const router = useRouter();
  const { sessionId } = router.query;
  const [phase, setPhase] = useState('confirm'); // confirm | processing
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data } = useSWR(sessionId ? `/api/driver/sessions/${sessionId}` : null, fetcher, {
    revalidateOnFocus: false,
  });
  const s = data?.data || null;

  useEffect(() => {
    if (!sessionId) return;
  }, [sessionId]);

  return (
    <DriverLayout requireAuth>
      <Meta title="Termina ricarica - Area Conducente" />
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Termina ricarica</h1>

        <Card>
          <Card.Body>
            <div className="font-semibold">{s?.station?.name || 'Ricarica in corso'}</div>
            <div className="text-sm text-gray-600">{s?.station?.location || '—'}</div>
          </Card.Body>
        </Card>

        {phase === 'confirm' && (
          <Card>
            <Card.Body>
              <div className="text-lg font-semibold">Operazione in elaborazione</div>
              <div className="text-gray-700 mt-2">
                Per proseguire, conferma di aver terminato la ricarica cliccando su <span className="font-semibold">“Ho scollegato il connettore”</span>.
              </div>
              <div className="mt-4">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isSubmitting}
                  onClick={async () => {
                    setIsSubmitting(true);
                    setPhase('processing');
                    try {
                      const resp = await api(`/api/driver/sessions/${sessionId}/stop`, { method: 'POST', body: {} });
                      if (resp?.errors) {
                        Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                        setPhase('confirm');
                        return;
                      }
                      router.replace(`/driver/charge/success?sessionId=${encodeURIComponent(sessionId)}`);
                    } catch (e) {
                      toast.error(e?.message || 'Errore stop');
                      setPhase('confirm');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                >
                  Ho scollegato il connettore
                </Button>
              </div>
            </Card.Body>
          </Card>
        )}

        {phase === 'processing' && (
          <Card>
            <Card.Body>
              <div className="text-lg font-semibold">Operazione in elaborazione</div>
              <div className="text-gray-700 mt-2">Stiamo chiudendo la sessione e preparando il riepilogo…</div>
            </Card.Body>
          </Card>
        )}
      </div>
    </DriverLayout>
  );
}

