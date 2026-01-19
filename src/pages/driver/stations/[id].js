import { useRouter } from 'next/router';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import Button from '@/components/Button/index';
import Link from 'next/link';

export default function DriverStationDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const { data, error, isLoading } = useSWR('/api/driver/stations', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const station = (data?.data || []).find((s) => s.id === id) || null;

  return (
    <DriverLayout>
      <Meta title="Dettaglio Stazione - Area Conducente" />
      <div className="space-y-4">
        <Button className="bg-gray-200 hover:bg-gray-300 text-gray-800" onClick={() => router.back()}>
          Indietro
        </Button>

        {isLoading ? (
          <Card>
            <Card.Body>Caricamento...</Card.Body>
          </Card>
        ) : error || !station ? (
          <Card>
            <Card.Body className="text-red-600">Stazione non trovata</Card.Body>
          </Card>
        ) : (
          <>
            <Card>
              <Card.Body>
                <div className="flex gap-3">
                  <div className="w-16 h-16 rounded bg-gray-200 overflow-hidden flex items-center justify-center">
                    {station.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={station.logoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-600 text-sm">EV</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xl font-bold">{station.name}</div>
                    <div className="text-sm text-gray-600">{station.location || '—'}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {station.workspace?.name} • {station.ocppId}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header>
                <h2 className="font-semibold">Connettori</h2>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3">
                  {(station.connectors || []).map((c) => (
                    <div key={c.id} className="p-3 border rounded flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          Connettore {c.connectorId} {c.connectorType ? `(${c.connectorType})` : ''}
                        </div>
                        <div className="text-sm text-gray-600">
                          {c.maxPower ? `${c.maxPower} kW` : '—'} • Stato: {c.status}
                        </div>
                      </div>
                      <Link
                        className="inline-flex items-center justify-center px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                        href={`/driver/charge/confirm?stationId=${encodeURIComponent(station.id)}&connectorId=${encodeURIComponent(c.id)}`}
                      >
                        Avvia
                      </Link>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </>
        )}
      </div>
    </DriverLayout>
  );
}

