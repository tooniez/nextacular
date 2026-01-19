import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import AccountLayout from '@/layouts/AccountLayout';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';

export default function OrganizationsPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const pageSize = 20;

  const { data, error, mutate } = useSWR(
    isSuperAdmin
      ? `/api/account/organizations?status=${statusFilter}&search=${search}&page=${page}&pageSize=${pageSize}`
      : null,
    fetcher,
    {
      refreshInterval: autoRefresh ? 30000 : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      // Avoid hammering the API on auth errors / transient errors
      onErrorRetry: (err, _key, _config, _revalidate, { retryCount }) => {
        if (err?.status === 401 || err?.status === 403) return;
        if (retryCount >= 2) return;
      },
    }
  );

  useEffect(() => {
    if (isAuthLoading) return;
    if (isSuperAdmin) return;
    // #region agent log
    fetch('/api/_debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'rbac',
        hypothesisId: 'ORG_UI_DENY',
        location: 'pages/account/organizations.js',
        message: 'blocked organizations page (super admin only)',
        data: { path: router.asPath },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    router.replace('/account');
  }, [isAuthLoading, isSuperAdmin, router]);

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <Meta title="Organizzazioni - MSolution" />
        <div className="p-8">Loading...</div>
      </AccountLayout>
    );
  }

  if (!isSuperAdmin) return null;

  const organizations = data?.data?.data || [];
  const pagination = data?.data?.pagination || {};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount || 0);
  };

  return (
    <AccountLayout>
      <Meta title="Organizzazioni (Sub CPO) - MSolution" />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Organizzazioni</h1>
            <p className="text-gray-600 mt-1">Gestione Sub CPO (Charge Point Operators)</p>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center text-sm text-gray-700 mr-2">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              Auto-refresh (30s)
            </label>
            <button
              onClick={() => router.push('/account/organizations/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
            >
              + Nuova
            </button>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              Aggiorna
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded"
          >
            <option value="all">Tutti gli Status</option>
            <option value="active">Attive</option>
            <option value="suspended">Sospese</option>
          </select>
          <input
            type="text"
            placeholder="Cerca per nome o slug..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded flex-1"
          />
        </div>

        {/* Organizations Table */}
        {error ? (
          <Card>
            <Card.Body>
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800">Errore nel caricamento: {error.message}</p>
              </div>
            </Card.Body>
          </Card>
        ) : (
          <Card>
            <Card.Header className="bg-gray-100">
              <h2 className="text-lg font-semibold">Lista Organizzazioni</h2>
            </Card.Header>
            <Card.Body>
              {organizations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nessuna organizzazione trovata
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          {/* Edit icon column */}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Ragione Sociale
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Indirizzo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          CAP
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Comune
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Referente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Stazioni
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Ultimo Aggiornamento
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {organizations.map((org) => (
                        <tr key={org.id} className="hover:bg-gray-50">
                          {/* Edit icon column */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <button
                              onClick={() => router.push(`/account/organizations/${org.id}`)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Modifica Organizzazione"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </td>
                          {/* Ragione Sociale */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{org.name}</div>
                          </td>
                          {/* Indirizzo */}
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{org.address || '—'}</div>
                          </td>
                          {/* CAP */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{org.cap || '—'}</div>
                          </td>
                          {/* Comune */}
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{org.comune || '—'}</div>
                          </td>
                          {/* Referente */}
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{org.referente || '—'}</div>
                          </td>
                          {/* Stazioni */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{org.stationsCount || 0}</div>
                          </td>
                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                org.isSuspended
                                  ? 'bg-red-100 text-red-800'
                                  : org.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {org.isSuspended
                                ? 'Sospesa'
                                : org.isActive
                                ? 'Attiva'
                                : 'Inattiva'}
                            </span>
                          </td>
                          {/* Ultimo Aggiornamento */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {org.lastUpdate
                                ? new Date(org.lastUpdate).toLocaleString('it-IT', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })
                                : '—'}
                            </div>
                          </td>
                          {/* Azioni */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => router.push(`/account/organizations/${org.id}`)}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                              title="Modifica"
                            >
                              Modifica
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ← Precedente
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Pagina {pagination.page || page} di {pagination.totalPages || 1}
              {' '}({pagination.total || 0} totali)
            </span>
            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages || 1, p + 1))}
              disabled={page >= (pagination.totalPages || 1)}
              className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Successiva →
            </button>
          </div>
        )}

        {/* Summary Stats */}
        {organizations.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Totale Organizzazioni</div>
              <div className="text-2xl font-bold">{pagination.total || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Totale Stazioni</div>
              <div className="text-2xl font-bold">
                {organizations.reduce((sum, org) => sum + (org.stationsCount || 0), 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Ricariche Attive</div>
              <div className="text-2xl font-bold">
                {organizations.reduce((sum, org) => sum + (org.activeSessionsCount || 0), 0)}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Revenue Totale (30gg)</div>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  organizations.reduce((sum, org) => sum + (org.revenue30Days || 0), 0)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
