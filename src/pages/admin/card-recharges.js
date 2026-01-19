import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import useSWR from 'swr';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  PlusIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminCardRechargesPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1, // Current month
    year: new Date().getFullYear(), // Current year
    page: 1,
    pageSize: 50,
  });

  const queryParams = new URLSearchParams({
    month: filters.month || '',
    year: filters.year || '',
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data, error, isLoading, mutate } = useSWR(
    isSuperAdmin ? `/api/admin/card-recharges?${queryParams}` : null,
    fetcher
  );

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.push('/account');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleRefresh = () => {
    mutate();
  };

  const recharges = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pageSize: 50, totalPages: 0 };

  // Generate month options
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(2024, i, 1), 'MMMM', { locale: it }),
  }));

  // Generate year options (last 5 years + current)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <Meta title="Caricamento..." />
        <div className="p-6">Caricamento...</div>
      </AccountLayout>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: it });
    } catch {
      return 'N/A';
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '0.00 EUR';
    return `${amount.toFixed(2)} EUR`;
  };

  return (
    <AccountLayout>
      <Meta title="Ricariche Carte - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ricariche Carte</h1>
            <p className="text-gray-600 mt-1">Visualizza tutte le ricariche carte</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleRefresh}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              <ArrowPathIcon className="w-5 h-5 mr-2" />
              Aggiorna
            </Button>
            <Button
              onClick={() => router.push('/admin/card-recharges/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Nuova
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Card.Body>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mese
                </label>
                <select
                  value={filters.month}
                  onChange={(e) => handleFilterChange('month', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[120px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anno
                </label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Table */}
        <Card>
          <Card.Body className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Caricamento ricariche...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                Errore nel caricamento delle ricariche
              </div>
            ) : recharges.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nessuna ricarica trovata per il periodo selezionato
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Canale
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Importo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Carta / Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Punto Vendita
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scontrino
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fattura
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recharges.map((recharge) => (
                      <tr key={recharge.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateTime(recharge.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-green-500 rounded mr-2 flex items-center justify-center">
                              <span className="text-white text-xs">🏢</span>
                            </div>
                            <span className="text-sm text-gray-900">{recharge.channel || 'stripe'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(recharge.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            {recharge.status || 'Completato'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{recharge.cardSerial || 'N/A'}</div>
                            <div className="text-xs text-gray-500">{recharge.cardType || 'Digitale'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {recharge.pointOfSale ? (
                            <div>
                              <div>{recharge.pointOfSale.name}</div>
                              <div className="text-xs text-gray-500">({recharge.pointOfSale.email})</div>
                            </div>
                          ) : (
                            <span>N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {/* Placeholder for receipt link */}
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {/* Placeholder for invoice link */}
                          -
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando {((pagination.page - 1) * pagination.pageSize) + 1} - {Math.min(pagination.page * pagination.pageSize, pagination.total)} di {pagination.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
                  >
                    Precedente
                  </Button>
                  <Button
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
                  >
                    Successivo
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
