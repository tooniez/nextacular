import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import Link from 'next/link';

export default function DriverSessionsPage() {
  const { data, error, isLoading } = useSWR('/api/driver/sessions?page=1&pageSize=20', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const sessions = data?.data || [];

  return (
    <DriverLayout requireAuth>
      <Meta title="Storico ricariche - Area Conducente" />
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Storico ricariche</h1>

        {isLoading ? (
          <Card>
            <Card.Body>Caricamento...</Card.Body>
          </Card>
        ) : error ? (
          <Card>
            <Card.Body className="text-red-600">Errore nel caricamento</Card.Body>
          </Card>
        ) : sessions.length === 0 ? (
          <Card>
            <Card.Body>Nessuna ricarica trovata.</Card.Body>
          </Card>
        ) : (
          <Card>
            <Card.Body className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quando</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stazione</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">kWh</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Importo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stato</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dettagli</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {new Date(s.startTime).toLocaleString('it-IT')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{s.station?.name || '—'}</div>
                          <div className="text-xs text-gray-500">{s.station?.location || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{(s.energyKwh || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">{(s.grossAmount || 0).toFixed(2)} €</td>
                        <td className="px-4 py-3 text-sm">{s.status}</td>
                        <td className="px-4 py-3 text-sm">
                          <Link className="text-blue-600 hover:underline" href={`/driver/sessions/${s.id}`}>
                            Apri
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card.Body>
          </Card>
        )}
      </div>
    </DriverLayout>
  );
}

