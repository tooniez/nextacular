import DriverLayout from '@/layouts/DriverLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import Link from 'next/link';

function formatEur(v) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v || 0);
}

export default function DriverActivityPage() {
  const { data, error, isLoading } = useSWR('/api/driver/activity', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 5000,
  });

  const items = data?.data || [];

  return (
    <DriverLayout requireAuth>
      <Meta title="Attività - Area Conducente" />
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Attività</h1>

        {isLoading ? (
          <Card><Card.Body>Caricamento...</Card.Body></Card>
        ) : error ? (
          <Card><Card.Body className="text-red-600">Errore nel caricamento</Card.Body></Card>
        ) : items.length === 0 ? (
          <Card><Card.Body>Nessuna attività.</Card.Body></Card>
        ) : (
          <Card>
            <Card.Body className="p-0">
              <div className="divide-y">
                {items.map((it, idx) => (
                  <div key={idx} className="p-4">
                    <div className="text-xs text-gray-500">{new Date(it.createdAt).toLocaleString('it-IT')}</div>
                    {it.type === 'SESSION' && (
                      <div className="mt-1">
                        <div className="font-semibold">Ricarica</div>
                        <div className="text-sm text-gray-700">{it.payload.station}</div>
                        <div className="text-sm text-gray-600">
                          {formatEur(it.payload.grossAmount)} • {(it.payload.energyKwh || 0).toFixed(2)} kWh • {it.payload.status}
                        </div>
                      </div>
                    )}
                    {it.type === 'TOPUP' && (
                      <div className="mt-1">
                        <div className="font-semibold">Ricarica Wallet</div>
                        <div className="text-sm text-gray-700">{formatEur(it.payload.amountEur)} • {it.payload.status}</div>
                      </div>
                    )}
                    {it.type === 'VOUCHER' && (
                      <div className="mt-1">
                        <div className="font-semibold">Voucher riscattato</div>
                        <div className="text-sm text-gray-700">{it.payload.code} • {formatEur(it.payload.amountEur)}</div>
                      </div>
                    )}
                    {it.type === 'RESERVATION' && (
                      <div className="mt-1">
                        <div className="font-semibold">Prenotazione</div>
                        <div className="text-sm text-gray-700">{it.payload.station} • {it.payload.status}</div>
                        <div className="text-sm text-gray-600">
                          Fee {formatEur(it.payload.feeEur)} • fino a {new Date(it.payload.reservedUntil).toLocaleTimeString('it-IT')}
                        </div>
                      </div>
                    )}
                    {it.type === 'TICKET' && (
                      <div className="mt-1">
                        <div className="font-semibold">Assistenza</div>
                        <div className="text-sm text-gray-700">{it.payload.subject} • {it.payload.status}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        )}

        <div className="text-sm text-gray-600">
          Storico completo: <Link className="text-blue-600 hover:underline" href="/driver/sessions">Ricariche</Link> •{' '}
          <Link className="text-blue-600 hover:underline" href="/driver/wallet">Wallet</Link>
        </div>
      </div>
    </DriverLayout>
  );
}

