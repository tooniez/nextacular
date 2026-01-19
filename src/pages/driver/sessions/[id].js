import { useRouter } from 'next/router';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import Button from '@/components/Button/index';

export default function DriverSessionDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const { data, error, isLoading } = useSWR(id ? `/api/driver/sessions/${id}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const s = data?.data || null;

  return (
    <DriverLayout requireAuth>
      <Meta title="Dettaglio ricarica - Area Conducente" />
      <div className="space-y-4">
        <Button className="bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={() => router.back()}>
          Indietro
        </Button>

        {isLoading ? (
          <Card>
            <Card.Body>Caricamento...</Card.Body>
          </Card>
        ) : error || !s ? (
          <Card>
            <Card.Body className="text-red-600">Sessione non trovata</Card.Body>
          </Card>
        ) : (
          <Card>
            <Card.Body>
              <div className="space-y-2">
                <div className="text-xl font-bold">{s.station?.name}</div>
                <div className="text-sm text-gray-600">{s.station?.location}</div>
                <div className="text-sm">
                  Inizio: <span className="font-medium">{new Date(s.startTime).toLocaleString('it-IT')}</span>
                </div>
                <div className="text-sm">
                  Fine:{' '}
                  <span className="font-medium">
                    {s.endTime ? new Date(s.endTime).toLocaleString('it-IT') : '—'}
                  </span>
                </div>
                <div className="text-sm">
                  Energia: <span className="font-medium">{(s.energyKwh || 0).toFixed(2)} kWh</span>
                </div>
                <div className="text-sm">
                  Importo: <span className="font-medium">{(s.grossAmount || 0).toFixed(2)} €</span>
                </div>
                <div className="text-sm">
                  Pagamento: <span className="font-medium">{s.paymentStatus}</span>
                </div>
                <div className="text-sm">
                  Stato: <span className="font-medium">{s.status}</span>
                </div>
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </DriverLayout>
  );
}

