import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAdminPayouts } from '@/hooks/data';

export default function AdminPayoutsPage() {
  const { isSuperAdmin, isLoading } = useSuperAdmin();
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    from: '',
    to: '',
    page: 1,
    pageSize: 20,
  });

  const { payouts, pagination, isLoading: isLoadingData } = useAdminPayouts(
    filters,
    !isLoading && isSuperAdmin
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <AccountLayout>
        <Meta title="Caricamento..." />
        <div className="p-6">Caricamento...</div>
      </AccountLayout>
    );
  }

  if (!isSuperAdmin) {
    router.push('/account');
    return null;
  }

  return (
    <AccountLayout>
      <Meta title="Tutti i Pagamenti - Super Admin" />
      <div className="p-6">
        <Card>
          <Card.Header>
            <h1 className="text-2xl font-bold">Tutti i Pagamenti</h1>
            <p className="text-gray-600 mt-2">Visualizza tutti i pagamenti di tutte le organizzazioni</p>
          </Card.Header>
          <Card.Body>
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  className="px-3 py-2 border rounded w-full md:w-80"
                  placeholder="Cerca organizzazione (nome o slug)"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                <select
                  className="px-3 py-2 border rounded w-full md:w-56"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Tutti gli stati</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="ISSUED">ISSUED</option>
                  <option value="PAID">PAID</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
                <input
                  type="date"
                  className="px-3 py-2 border rounded w-full md:w-48"
                  value={filters.from}
                  onChange={(e) => handleFilterChange('from', e.target.value)}
                />
                <input
                  type="date"
                  className="px-3 py-2 border rounded w-full md:w-48"
                  value={filters.to}
                  onChange={(e) => handleFilterChange('to', e.target.value)}
                />
              </div>
            </div>

            {isLoadingData ? (
              <div className="p-6 text-center text-gray-500">Caricamento pagamenti...</div>
            ) : !payouts || payouts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Nessun pagamento trovato.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold">Organizzazione</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Periodo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Stato</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Sessioni</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Energia (kWh)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Importo</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((payout) => (
                      <tr key={payout.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{payout.workspace?.name || '—'}</div>
                          <div className="text-xs text-gray-500">{payout.workspace?.slug || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {format(new Date(payout.periodStart), 'dd/MM/yyyy')} -{' '}
                          {format(new Date(payout.periodEnd), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              payout.status === 'PAID'
                                ? 'bg-green-100 text-green-800'
                                : payout.status === 'ISSUED'
                                ? 'bg-blue-100 text-blue-800'
                                : payout.status === 'DRAFT'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {payout.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">{payout.totalSessions ?? '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          {typeof payout.totalEnergyKwh === 'number' ? payout.totalEnergyKwh.toFixed(2) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {formatCurrency(payout.totalSubCpoEarning, payout.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {payout.workspace?.slug ? (
                            <Link
                              href={`/account/${payout.workspace.slug}/payouts/${payout.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              Apri
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {pagination?.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 px-2">
                <div className="text-sm text-gray-600">
                  Pagina {pagination.page} di {pagination.totalPages} ({pagination.total} totali)
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 border rounded disabled:opacity-50"
                    disabled={pagination.page === 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Indietro
                  </button>
                  <button
                    className="px-3 py-1 border rounded disabled:opacity-50"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Avanti
                  </button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
