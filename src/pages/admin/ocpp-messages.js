import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Meta/index';
import Button from '@/components/Button/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import useSWR from 'swr';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
  TrashIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminOcppMessagesPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    type: 'all',
    stationId: 'all',
    action: 'all',
    page: 1,
    pageSize: 100,
  });

  const queryParams = new URLSearchParams({
    type: filters.type,
    stationId: filters.stationId,
    action: filters.action,
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data, error, isLoading, mutate } = useSWR(
    isSuperAdmin ? `/api/admin/ocpp-messages?${queryParams}` : null,
    fetcher
  );

  // Get stations for filter
  const { data: stationsData } = useSWR(
    isSuperAdmin ? '/api/admin/stations?page=1&pageSize=1000' : null,
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

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler cancellare tutti i messaggi OCPP? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/ocpp-messages?${queryParams}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('Messaggi OCPP cancellati con successo');
        mutate();
      }
    } catch (error) {
      toast.error('Errore durante la cancellazione');
    }
  };

  const messages = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pageSize: 100, totalPages: 0 };
  const stations = stationsData?.data || [];

  // Get unique actions from messages for filter
  const uniqueActions = [...new Set(messages.map(m => m.action))].sort();

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
      return format(new Date(date), 'dd/MM/yyyy HH:mm:ss', { locale: it });
    } catch {
      return 'N/A';
    }
  };

  return (
    <AccountLayout>
      <Meta title="Messaggi OCPP - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <PaperAirplaneIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Messaggi OCPP</h1>
          </div>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <TrashIcon className="w-5 h-5 mr-2" />
            Cancella Messaggi
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Card.Body>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tutti i Tipi</option>
                  <option value="CALL">CALL</option>
                  <option value="CALLRESULT">CALLRESULT</option>
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
                >
                  <option value="all">Tutte le Stazioni di Ricarica</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name} ({station.ocppId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Azione
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tutte le Azioni</option>
                  {uniqueActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
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
                <p className="mt-4 text-gray-600">Caricamento messaggi...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                Errore nel caricamento dei messaggi
              </div>
            ) : messages.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nessun messaggio trovato
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
                        Stazione Ricarica
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Verso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Id OCPP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azione
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dettaglio Messaggio
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {messages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateTime(msg.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {msg.stationOcppId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {msg.directionFormatted}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono text-xs">
                          {msg.ocppId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {msg.action}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <pre className="text-xs bg-gray-50 p-2 rounded max-w-md overflow-auto">
                            {typeof msg.payloadDetail === 'object' 
                              ? JSON.stringify(msg.payloadDetail, null, 2)
                              : msg.payload || '[]'}
                          </pre>
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
