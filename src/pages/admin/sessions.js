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
  ArrowPathIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  Cog6ToothIcon,
  StopCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminSessionsPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    workspace: 'all',
    status: 'all',
    stationId: 'all',
    month: new Date().getMonth() + 1, // Current month
    year: new Date().getFullYear(), // Current year
    page: 1,
    pageSize: 50,
  });

  const queryParams = new URLSearchParams({
    workspace: filters.workspace,
    status: filters.status,
    stationId: filters.stationId,
    month: filters.month || '',
    year: filters.year || '',
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data, error, isLoading, mutate } = useSWR(
    isSuperAdmin ? `/api/admin/sessions?${queryParams}` : null,
    fetcher
  );

  // Get workspaces for filter
  const { data: workspacesData } = useSWR(
    isSuperAdmin ? '/api/admin/workspaces?page=1&pageSize=100' : null,
    fetcher
  );

  // Get stations for filter
  const { data: stationsData } = useSWR(
    isSuperAdmin && filters.workspace !== 'all' 
      ? `/api/admin/stations?network=${filters.workspace}&page=1&pageSize=1000` 
      : null,
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

  const handleExport = () => {
    const url = `/api/admin/sessions/export.csv?${queryParams.toString()}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleStopSession = async (sessionId) => {
    if (!confirm('Sei sicuro di voler interrompere questa ricarica?')) {
      return;
    }
    try {
      const resp = await api(`/api/admin/sessions/${sessionId}/stop`, { method: 'POST', body: {} });
      if (resp?.errors) {
        Object.keys(resp.errors).forEach((k) => toast.error(resp.errors[k]?.msg || 'Errore'));
        return;
      }
      toast.success('Ricarica interrotta');
      mutate();
    } catch (e) {
      toast.error(e?.message || 'Errore durante interruzione');
    }
  };

  const sessions = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pageSize: 50, totalPages: 0 };
  const workspaces = workspacesData?.data?.workspaces || [];
  const stations = stationsData?.data || [];

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
    if (amount === null || amount === undefined) return '€ 0.00';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status, stopReason) => {
    if (status === 'COMPLETED' || status === 'FINISHED') {
      const reason = stopReason || 'Terminata';
      return (
        <span className="text-green-600 font-medium">
          {reason}
        </span>
      );
    } else if (status === 'CHARGING' || status === 'IN_PROGRESS') {
      return (
        <span className="text-red-600 font-medium">
          In Corso
        </span>
      );
    } else {
      return (
        <span className="text-gray-600">
          {status}
        </span>
      );
    }
  };

  return (
    <AccountLayout>
      <Meta title="Ricariche Veicoli - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ricariche Veicoli</h1>
            <p className="text-gray-600 mt-1">Visualizza tutte le ricariche di tutte le organizzazioni</p>
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
              onClick={handleExport}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
              Esporta
            </Button>
            <Button
              onClick={handlePrint}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              <PrinterIcon className="w-5 h-5 mr-2" />
              Stampa
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Card.Body>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organizzazione
                </label>
                <select
                  value={filters.workspace}
                  onChange={(e) => handleFilterChange('workspace', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tutte le Organizzazioni</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.slug}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stato
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tutte</option>
                  <option value="COMPLETED">Terminate</option>
                  <option value="CHARGING">In Corso</option>
                  <option value="PENDING">In Attesa</option>
                </select>
              </div>
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stazione
                </label>
                <select
                  value={filters.stationId}
                  onChange={(e) => handleFilterChange('stationId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={filters.workspace === 'all'}
                >
                  <option value="all">Tutte le Stazioni di Ricarica</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name} ({station.ocppId})
                    </option>
                  ))}
                </select>
              </div>
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
              <div className="flex items-end">
                <button
                  type="button"
                  className="p-2 text-gray-600 hover:text-gray-900"
                  title="Impostazioni colonne"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </button>
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
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nessuna ricarica trovata
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-blue-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Inizio e Fine
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Stato Motivo % Carica
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Stazione di Ricarica Indirizzo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Carta Rfid Tipo Carta Transazione Conducente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        kWh Prelevati Durata (HH:MM:SS)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Ricavo x kWh Ricavo x Ora Energia x kWh
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Ricavo - Costo Energia
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Guadagno
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          <div>
                            <div>{formatDateTime(session.startTime)}</div>
                            {session.endTime && (
                              <div className="text-gray-500">{formatDateTime(session.endTime)}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getStatusBadge(session.status, session.stopReason)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{session.station?.name || 'N/A'}</div>
                            <div className="text-xs text-gray-500">
                              {session.station?.ocppId || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {session.station?.location || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div className="text-xs">
                              <span className="font-medium">Carta:</span> {session.rfidToken || session.ocppIdTag || 'N/A'}
                            </div>
                            <div className="text-xs">
                              <span className="font-medium">Tipo:</span> {session.cardType}
                            </div>
                            <div className="text-xs">
                              <span className="font-medium">Transazione:</span> {session.ocppTransactionId || 'N/A'}
                            </div>
                            <div className="text-xs">
                              <span className="font-medium">Conducente:</span> {session.driverName}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          <div>
                            <div>{session.energyKwh?.toFixed(2) || '0.00'} kWh</div>
                            <div className="text-gray-500">{session.durationFormatted || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="text-xs">
                            <div>Ricavo kWh: {formatCurrency(session.pricePerKwh)}</div>
                            <div>Ricavo Ora: {formatCurrency(session.pricePerMinute ? session.pricePerMinute * 60 : 0)}</div>
                            <div>Energia kWh: {formatCurrency(session.energyCostPerKwh)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          <div>
                            <div>Ricavo: {formatCurrency(session.totalRevenue)}</div>
                            <div className="text-gray-500">Costo: {formatCurrency(session.energyCost)}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600 whitespace-nowrap">
                          {formatCurrency(session.profit)}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          {(session.status === 'CHARGING' || session.status === 'IN_PROGRESS') && (
                            <button
                              onClick={() => handleStopSession(session.id)}
                              className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700"
                              title="Interrompi ricarica"
                            >
                              <StopCircleIcon className="w-4 h-4" />
                            </button>
                          )}
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
