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
  MagnifyingGlassIcon, 
  PlusIcon,
  QrCodeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminStationsPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    network: 'all',
    page: 1,
    pageSize: 50,
  });

  const { data, error, isLoading, mutate } = useSWR(
    isSuperAdmin ? `/api/admin/stations?${new URLSearchParams({
      search: filters.search,
      status: filters.status || '',
      network: filters.network,
      page: filters.page,
      pageSize: filters.pageSize,
    })}` : null,
    fetcher
  );

  // Get workspaces for network filter
  const { data: workspacesData } = useSWR(
    isSuperAdmin ? '/api/admin/workspaces?page=1&pageSize=100' : null,
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

  const stations = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pageSize: 50, totalPages: 0 };
  const workspaces = workspacesData?.data?.workspaces || [];

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

  const getStatusBadge = (status) => {
    const statusMap = {
      AVAILABLE: { label: 'Disponibile', color: 'bg-green-100 text-green-800' },
      OFFLINE: { label: 'Offline', color: 'bg-gray-100 text-gray-800' },
      FAULTED: { label: 'Non Funzionante', color: 'bg-red-100 text-red-800' },
      CHARGING: { label: 'In Ricarica', color: 'bg-blue-100 text-blue-800' },
      PREPARING: { label: 'Preparazione', color: 'bg-yellow-100 text-yellow-800' },
    };
    const statusInfo = statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const formatLastHeartbeat = (date) => {
    if (!date) return 'Mai';
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: it });
    } catch {
      return 'Mai';
    }
  };

  return (
    <AccountLayout>
      <Meta title="Stazioni di Ricarica - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Stazioni di Ricarica</h1>
            <p className="text-gray-600 mt-1">Gestisci tutte le stazioni di ricarica</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => router.push('/admin/stations/new')}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Nuova
            </Button>
            <Button
              onClick={() => router.push('/admin/stations/qr-codes')}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <QrCodeIcon className="w-5 h-5 mr-2" />
              Genera Codici QR
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Card.Body>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[300px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cerca
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ID..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>
              </div>
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rete
                </label>
                <select
                  value={filters.network}
                  onChange={(e) => handleFilterChange('network', e.target.value)}
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
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stato
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tutti gli Stati</option>
                  <option value="AVAILABLE">Disponibile</option>
                  <option value="OFFLINE">Offline</option>
                  <option value="FAULTED">Non Funzionante</option>
                  <option value="CHARGING">In Ricarica</option>
                </select>
              </div>
              <Button
                onClick={() => {
                  setFilters({ search: '', status: '', network: 'all', page: 1, pageSize: 50 });
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Reset
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* Stats */}
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Totale Stazioni</p>
                <p className="text-3xl font-bold text-blue-900">{pagination.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <Card>
          <Card.Body className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Caricamento stazioni...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                Errore nel caricamento delle stazioni
              </div>
            ) : stations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nessuna stazione trovata
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azioni
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Etichetta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ubicazione
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modello
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registrazione
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attiva
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ultimo Ascolto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stato Rete
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stations.map((station) => (
                      <tr key={station.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/admin/stations/${station.id}`}
                            className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {station.ocppId}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{station.name}</div>
                            {station.workspace && (
                              <div className="text-xs text-gray-500 mt-1">
                                {station.workspace.name}
                              </div>
                            )}
                            {station.connectors?.list?.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                {station.connectors.list.map((conn, idx) => (
                                  <span key={conn.id}>
                                    {conn.maxPower || 'N/A'} kWh - {conn.status === 'AVAILABLE' ? 'Disponibile' : conn.status}
                                    {idx < station.connectors.list.length - 1 && ', '}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {station.location || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {station.model || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <CheckCircleIcon className="w-5 h-5 text-green-500 mr-1" />
                            <span className="text-sm text-green-600">Accettata</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(station.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            {station.status !== 'OFFLINE' && station.status !== 'FAULTED' ? (
                              <>
                                <CheckCircleIcon className="w-5 h-5 text-green-500 mr-1" />
                                <span>Si</span>
                              </>
                            ) : (
                              <>
                                <XCircleIcon className="w-5 h-5 text-red-500 mr-1" />
                                <span>No</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <ClockIcon className="w-4 h-4 mr-1" />
                            {formatLastHeartbeat(station.lastHeartbeat)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {station.lastHeartbeat ? (
                            <div>
                              <div>Connessa dal {formatLastHeartbeat(station.lastHeartbeat)}</div>
                              {/* IP would come from OCPP messages or station config */}
                            </div>
                          ) : (
                            <span className="text-red-600">Non connessa</span>
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
