import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import useSWR from 'swr';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { 
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminErrorLogsPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    severity: 'all',
    page: 1,
    pageSize: 100,
  });

  const queryParams = new URLSearchParams({
    severity: filters.severity,
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data, error, isLoading, mutate } = useSWR(
    isSuperAdmin ? `/api/admin/error-logs?${queryParams}` : null,
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
    if (!confirm('Sei sicuro di voler cancellare tutti i log errori? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/error-logs', {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('Log errori cancellati con successo');
        mutate();
      }
    } catch (error) {
      toast.error('Errore durante la cancellazione');
    }
  };

  const logs = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pageSize: 100, totalPages: 0 };

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

  const getLogIcon = (type) => {
    switch (type) {
      case 'INFO':
      case 'Informazione':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      case 'WARN':
      case 'Avvertimento':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'ERROR':
      case 'Errore':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'SUCCESS':
      case 'Successo':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <AccountLayout>
      <Meta title="Log Errori - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Log Errori</h1>
            <p className="text-gray-600 mt-1">Visualizza tutti i log errori del sistema</p>
          </div>
          <Button
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <TrashIcon className="w-5 h-5 mr-2" />
            Cancella Log
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Card.Body>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Log
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tutti</option>
                  <option value="Successo">Successo</option>
                  <option value="Informazione">Informazione</option>
                  <option value="Avvertimento">Avvertimento</option>
                  <option value="Errore">Errore</option>
                  <option value="Debug">Debug</option>
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
                <p className="mt-4 text-gray-600">Caricamento log...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                Errore nel caricamento dei log
              </div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nessun log trovato
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Errore
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getLogIcon(log.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDateTime(log.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            {log.title && (
                              <div className="font-medium mb-1">{log.title}</div>
                            )}
                            <div className="text-gray-600 whitespace-pre-wrap break-words">
                              {log.message}
                            </div>
                            {log.context && (
                              <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto">
                                {JSON.stringify(log.context, null, 2)}
                              </pre>
                            )}
                          </div>
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
