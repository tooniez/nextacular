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
  LockClosedIcon,
  LockOpenIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminBlockedIpsPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  
  const [filters, setFilters] = useState({
    filter: 'all',
    page: 1,
    pageSize: 50,
  });

  const [blockIpModal, setBlockIpModal] = useState(false);
  const [newIp, setNewIp] = useState('');

  const queryParams = new URLSearchParams({
    filter: filters.filter,
    page: filters.page,
    pageSize: filters.pageSize,
  });

  const { data, error, isLoading, mutate } = useSWR(
    isSuperAdmin ? `/api/admin/blocked-ips?${queryParams}` : null,
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

  const handleBlockIp = async () => {
    if (!newIp) {
      toast.error('Inserisci un indirizzo IP');
      return;
    }

    try {
      const response = await fetch('/api/admin/blocked-ips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip: newIp }),
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('IP bloccato con successo');
        setBlockIpModal(false);
        setNewIp('');
        mutate();
      }
    } catch (error) {
      toast.error('Errore durante il blocco IP');
    }
  };

  const handleUnblockIp = async (ip) => {
    if (!confirm(`Sei sicuro di voler sbloccare l'IP ${ip}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/admin/blocked-ips', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip }),
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('IP sbloccato con successo');
        mutate();
      }
    } catch (error) {
      toast.error('Errore durante lo sblocco IP');
    }
  };

  const ips = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, pageSize: 50, totalPages: 0 };

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

  const getCountryFlag = (countryCode) => {
    // Placeholder for country flag emoji
    // In production, you'd use a flag library or images
    return '🌍';
  };

  return (
    <AccountLayout>
      <Meta title="Ip Bloccati - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Ip Bloccati</h1>
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
              onClick={() => setBlockIpModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <LockClosedIcon className="w-5 h-5 mr-2" />
              Lock Ip
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <Card.Body>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filtro
                </label>
                <select
                  value={filters.filter}
                  onChange={(e) => handleFilterChange('filter', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tutti</option>
                  <option value="blocked">Bloccati</option>
                  <option value="unblocked">Non Bloccati</option>
                </select>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* Block IP Modal */}
        {blockIpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Blocca IP</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Indirizzo IP
                </label>
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="es. 192.168.1.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  onClick={() => {
                    setBlockIpModal(false);
                    setNewIp('');
                  }}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleBlockIp}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Blocca
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <Card>
          <Card.Body className="p-0">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Caricamento IP...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                Errore nel caricamento degli IP
              </div>
            ) : ips.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Nessun IP trovato
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Indirizzo Ip
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nz.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nazione
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Login Falliti
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bloccato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ultimo Tentativo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Sblocco
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ips.map((ipData, index) => (
                      <tr key={ipData.ip || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {ipData.ip}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="text-2xl">{getCountryFlag(ipData.countryCode)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ipData.country || 'UNKNOWN'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {ipData.failedLogins || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ipData.blocked ? (
                            <LockClosedIcon className="w-5 h-5 text-red-500" />
                          ) : (
                            <LockOpenIcon className="w-5 h-5 text-green-500" />
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(ipData.lastAttempt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ipData.blocked && ipData.unblockDate 
                            ? formatDateTime(ipData.unblockDate)
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {ipData.blocked ? (
                            <button
                              onClick={() => handleUnblockIp(ipData.ip)}
                              className="text-green-600 hover:text-green-800"
                              title="Sblocca IP"
                            >
                              <LockOpenIcon className="w-5 h-5" />
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
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
