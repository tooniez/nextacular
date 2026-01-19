import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import Link from 'next/link';

export default function DriverStationsPage() {
  const { data, error, isLoading } = useSWR('/api/driver/stations', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const stations = data?.data || [];

  return (
    <DriverLayout>
      <Meta title="Stazioni - Area Conducente" />
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Stazioni di ricarica</h1>
        {isLoading ? (
          <Card>
            <Card.Body>Caricamento...</Card.Body>
          </Card>
        ) : error ? (
          <Card>
            <Card.Body className="text-red-600">Errore nel caricamento</Card.Body>
          </Card>
        ) : stations.length === 0 ? (
          <Card>
            <Card.Body>Nessuna stazione disponibile.</Card.Body>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stations.map((s) => (
              <Card key={s.id}>
                <Card.Body>
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden flex items-center justify-center">
                      {s.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-gray-600 text-sm">EV</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-sm text-gray-600">{s.location || '—'}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {s.workspace?.name} • {s.ocppId}
                      </div>
                      <div className="mt-3">
                        <Link className="text-blue-600 hover:underline" href={`/driver/stations/${s.id}`}>
                          Vedi dettagli / Avvia ricarica
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DriverLayout>
  );
}

