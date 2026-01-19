import Link from 'next/link';
import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import Button from '@/components/Button/index';

export default function DriverFavoritesPage() {
  const { data, mutate } = useSWR('/api/driver/favorites', fetcher, { revalidateOnFocus: false });
  const favs = data?.data || [];

  return (
    <DriverLayout requireAuth>
      <Meta title="Preferiti - Area Conducente" />
      <div className="space-y-4">
        <Link className="text-blue-600 hover:underline" href="/driver/profile">
          ← Profilo
        </Link>
        <h1 className="text-2xl font-bold">Preferiti</h1>

        {favs.length === 0 ? (
          <Card><Card.Body>Nessun preferito.</Card.Body></Card>
        ) : (
          <div className="space-y-3">
            {favs.map((s) => (
              <Card key={s.id}>
                <Card.Body>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-sm text-gray-600">{s.location || '—'}</div>
                    </div>
                    <div className="flex gap-2">
                      <Link className="text-blue-600 hover:underline self-center" href={`/driver/stations/${s.id}`}>
                        Apri
                      </Link>
                      <Button
                        className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-50"
                        onClick={async () => {
                          const resp = await api('/api/driver/favorites', { method: 'DELETE', body: { stationId: s.id } });
                          if (resp?.errors) {
                            Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
                            return;
                          }
                          mutate();
                        }}
                      >
                        Rimuovi
                      </Button>
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

