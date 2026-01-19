import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';

import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { fetcher } from '@/lib/client/fetcher';

const Dashboard = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, error, isLoading, mutate } = useSWR(
    workspace?.id ? `/api/dashboard/kpi?workspaceId=${workspace.id}&_t=${refreshKey}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Auto-refresh handler
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((prev) => prev + 1);
      mutate();
    }, 30000);

    return () => clearInterval(interval);
  }, [mutate]);

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!workspaceSlug) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Dashboard" />
        <Content.Title title="Dashboard" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  const kpi = data?.data || {};
  const connectors = kpi.connectors || { libere: 0, inRicarica: 0, prenotate: 0, nonFunzionanti: 0 };
  const offlineStations = kpi.offlineStations || [];
  const pendingStations = kpi.pendingStations || [];
  const sessionsInProgress = kpi.sessionsInProgress || [];

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | Dashboard`} />
      <Content.Title
        title="Dashboard"
        subtitle="Panoramica operativa della piattaforma"
      />
      <Content.Divider />

      {/* KPI Cards */}
      <Content.Container>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Libere */}
          <Card>
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">Libere</div>
                  <div className="text-3xl font-bold mt-2 text-green-600">
                    {isLoading ? '...' : connectors.libere}
                  </div>
                </div>
                <div className="text-4xl text-green-500">⚡</div>
              </div>
              <button className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors">
                VISUALIZZA
              </button>
            </Card.Body>
          </Card>

          {/* In Ricarica */}
          <Card>
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">In Ricarica</div>
                  <div className="text-3xl font-bold mt-2 text-blue-600">
                    {isLoading ? '...' : connectors.inRicarica}
                  </div>
                </div>
                <div className="text-4xl text-blue-500">🔌</div>
              </div>
              <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors">
                VISUALIZZA
              </button>
            </Card.Body>
          </Card>

          {/* Prenotate */}
          <Card>
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">Prenotate</div>
                  <div className="text-3xl font-bold mt-2 text-yellow-600">
                    {isLoading ? '...' : connectors.prenotate}
                  </div>
                </div>
                <div className="text-4xl text-yellow-500">⏰</div>
              </div>
              <button className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors">
                VISUALIZZA
              </button>
            </Card.Body>
          </Card>

          {/* Non Funzionanti */}
          <Card>
            <Card.Body>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-500">Non Funzionanti</div>
                  <div className="text-3xl font-bold mt-2 text-red-600">
                    {isLoading ? '...' : connectors.nonFunzionanti}
                  </div>
                </div>
                <div className="text-4xl text-red-500">⚠️</div>
              </div>
              <button className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors">
                VISUALIZZA
              </button>
            </Card.Body>
          </Card>
        </div>
      </Content.Container>

      <Content.Divider />

      {/* Data Panels */}
      <Content.Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stazioni di Ricarica Offline */}
          <Card>
            <Card.Header className="bg-red-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚂</span>
                  <h3 className="text-lg font-semibold">Stazioni di Ricarica Offline</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-white hover:text-gray-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button className="text-white hover:text-gray-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {isLoading ? (
                <div className="text-gray-400 text-center py-4">Caricamento...</div>
              ) : offlineStations.length === 0 ? (
                <div className="text-gray-400 text-center py-4">Nessuna stazione offline</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {offlineStations.map((station) => (
                        <tr key={station.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button className="text-red-600 hover:text-red-800">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                            {station.name}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {station.provider}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(station.lastUpdate)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {station.reason}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Stazioni di Ricarica da Approvare */}
            <Card>
              <Card.Header className="bg-orange-500 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👍</span>
                    <h3 className="text-lg font-semibold">Stazioni di Ricarica da Approvare</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-white hover:text-gray-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button className="text-white hover:text-gray-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                {isLoading ? (
                  <div className="text-gray-400 text-center py-4">Caricamento...</div>
                ) : pendingStations.length === 0 ? (
                  <div className="text-gray-400 text-center py-4">Nessuna stazione in attesa di approvazione</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {pendingStations.map((station) => (
                          <tr key={station.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              {station.name}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Ricariche Veicoli in Corso */}
            <Card>
              <Card.Header className="bg-blue-500 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🚗</span>
                    <h3 className="text-lg font-semibold">Ricariche Veicoli in Corso</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="text-white hover:text-gray-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button className="text-white hover:text-gray-200">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card.Header>
              <Card.Body>
                {isLoading ? (
                  <div className="text-gray-400 text-center py-4">Caricamento...</div>
                ) : sessionsInProgress.length === 0 ? (
                  <div className="text-gray-400 text-center py-4">Nessuna ricarica in corso</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        {sessionsInProgress.map((session) => (
                          <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                              {session.sessionId}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {session.location}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {session.transactionId}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {formatDateTime(session.startTime)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <button className="text-red-600 hover:text-red-800">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                                </svg>
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
          </div>
        </div>
      </Content.Container>

      {error && (
        <Content.Container>
          <Card>
            <Card.Body>
              <div className="text-red-600">
                Errore nel caricamento dei dati: {error.message || 'Errore sconosciuto'}
              </div>
            </Card.Body>
          </Card>
        </Content.Container>
      )}
    </AccountLayout>
  );
};

export default Dashboard;
