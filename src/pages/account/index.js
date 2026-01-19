import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useInvitations, useWorkspaces } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';

const Welcome = () => {
  const router = useRouter();
  const { data: invitationsData, isLoading: isFetchingInvitations } =
    useInvitations();
  const { data: workspacesData, isLoading: isFetchingWorkspaces } =
    useWorkspaces();
  const { setWorkspace } = useWorkspace();
  const { t } = useTranslation();
  const [isSubmitting, setSubmittingState] = useState(false);
  const { isSuperAdmin, isLoading: isSuperAdminLoading } = useSuperAdmin();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Keep Super Admin backend in /admin/** namespace.
  useEffect(() => {
    if (isSuperAdminLoading) return;
    if (!isSuperAdmin) return;
    const current = String(router.asPath || '').split('?')[0].split('#')[0];
    if (current === '/account') {
      router.replace('/admin/dashboard');
    }
  }, [isSuperAdminLoading, isSuperAdmin, router]);

  const accept = (memberId) => {
    setSubmittingState(true);
    api(`/api/workspace/team/accept`, {
      body: { memberId },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Accepted invitation!');
      }
    });
  };

  const decline = (memberId) => {
    setSubmittingState(true);
    api(`/api/workspace/team/decline`, {
      body: { memberId },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Declined invitation!');
      }
    });
  };

  const navigate = (workspace) => {
    setWorkspace(workspace);
    router.replace(`/account/${workspace.slug}`);
  };

  // Super Admin Dashboard Data
  const { data: dashboardData, error: dashboardError, mutate: refreshDashboard } = useSWR(
    isSuperAdmin ? '/api/account/dashboard' : null,
    fetcher,
    {
      refreshInterval: autoRefresh ? 30000 : 0,
      revalidateOnFocus: false,
      // Avoid hammering the API on auth errors
      onErrorRetry: (error, _key, _config, _revalidate, { retryCount }) => {
        if (error?.status === 401 || error?.status === 403) return;
        if (retryCount >= 2) return;
      },
    }
  );

  // #region agent log (console only to avoid CORS)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Account Page] Render check', {
        isSuperAdmin,
        isSuperAdminLoading,
        hasWorkspaces: !!workspacesData?.workspaces?.length,
      });
    }
  }, [isSuperAdmin, isSuperAdminLoading, workspacesData]);
  // #endregion

  // Super Admin Dashboard Component - Always show dashboard, never show workspace selection
  if (isSuperAdminLoading) {
    return (
      <AccountLayout>
        <Meta title="MSolution - Super Admin Dashboard" />
        <div className="p-8">Loading...</div>
      </AccountLayout>
    );
  }

  // If we are a Super Admin on /account, we are redirecting to /admin/dashboard.
  if (isSuperAdmin) {
    const current = String(router.asPath || '').split('?')[0].split('#')[0];
    if (current === '/account') return null;
  }

  if (isSuperAdmin) {
    const dashboard = dashboardData?.data;
    const kpi = dashboard?.kpi || { libere: 0, inRicarica: 0, prenotate: 0, nonFunzionanti: 0 };
    const offlineStations = dashboard?.offlineStations || [];
    const activeSessions = dashboard?.activeSessions || [];
    const systemInfo = dashboard?.systemInfo || { cpuPercent: 0, memoryPercent: 0, diskPercent: 0, latency: 0 };

    return (
      <AccountLayout>
        <Meta title="MSolution - Super Admin Dashboard" />
        <div className="p-6">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-gray-600 mt-1">Primo livello della piattaforma MSolution</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh (30s)
              </label>
              <button
                onClick={() => refreshDashboard()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Aggiorna
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Libere */}
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-green-800">Libere</span>
                <span className="text-2xl">🔌</span>
              </div>
              <div className="text-4xl font-bold text-green-700">{kpi.libere}</div>
              <button className="mt-4 text-sm text-green-700 hover:text-green-900 font-medium">
                VISUALIZZA →
              </button>
            </div>

            {/* In Ricarica */}
            <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-blue-800">In Ricarica</span>
                <span className="text-2xl">⚡</span>
              </div>
              <div className="text-4xl font-bold text-blue-700">{kpi.inRicarica}</div>
              <button className="mt-4 text-sm text-blue-700 hover:text-blue-900 font-medium">
                VISUALIZZA →
              </button>
            </div>

            {/* Prenotate */}
            <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-6 shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-yellow-800">Prenotate</span>
                <span className="text-2xl">⏰</span>
              </div>
              <div className="text-4xl font-bold text-yellow-700">{kpi.prenotate}</div>
              <button className="mt-4 text-sm text-yellow-700 hover:text-yellow-900 font-medium">
                VISUALIZZA →
              </button>
            </div>

            {/* Non Funzionanti */}
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-red-800">Non Funzionanti</span>
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="text-4xl font-bold text-red-700">{kpi.nonFunzionanti}</div>
              <button className="mt-4 text-sm text-red-700 hover:text-red-900 font-medium">
                VISUALIZZA →
              </button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Stazioni di Ricarica Offline */}
            <Card>
              <Card.Header className="bg-red-600 text-white">
                <h2 className="text-lg font-semibold">Stazioni di Ricarica Offline</h2>
              </Card.Header>
              <Card.Body>
                {offlineStations.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nessuna stazione offline</p>
                ) : (
                  <div className="space-y-3">
                    {offlineStations.map((station) => (
                      <div key={station.id} className="flex items-start justify-between p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <button className="text-gray-600 hover:text-blue-600">✏️</button>
                            <span className="font-semibold">{station.ocppId}</span>
                            <span className="text-sm text-gray-600">({station.network})</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(station.timestamp).toLocaleString('it-IT')}
                          </div>
                          <div className="text-sm text-red-600 mt-1">{station.errorMessage}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Ricariche Veicoli in Corso */}
            <Card>
              <Card.Header className="bg-blue-100 text-blue-900">
                <h2 className="text-lg font-semibold">Ricariche Veicoli in Corso</h2>
              </Card.Header>
              <Card.Body>
                {activeSessions.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nessuna ricarica in corso</p>
                ) : (
                  <div className="space-y-3">
                    {activeSessions.map((session) => (
                      <div key={session.id} className="flex items-start justify-between p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{session.sessionId}</span>
                            <button className="text-red-600 hover:text-red-800 ml-auto">⭕</button>
                          </div>
                          <div className="text-sm text-gray-700">{session.location}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {session.transactionId && `Transaction: ${session.transactionId}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(session.timestamp).toLocaleString('it-IT')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Informazioni Sistema */}
          <Card>
            <Card.Header className="bg-gray-100">
              <h2 className="text-lg font-semibold">Informazioni Sistema</h2>
            </Card.Header>
            <Card.Body>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* CPU */}
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">% CPU in Uso</div>
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - systemInfo.cpuPercent / 100)}`}
                        className={systemInfo.cpuPercent > 80 ? 'text-red-500' : systemInfo.cpuPercent > 60 ? 'text-yellow-500' : 'text-green-500'}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{systemInfo.cpuPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Memoria */}
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">% Memoria Usata</div>
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - systemInfo.memoryPercent / 100)}`}
                        className={systemInfo.memoryPercent > 80 ? 'text-red-500' : systemInfo.memoryPercent > 60 ? 'text-yellow-500' : 'text-green-500'}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{systemInfo.memoryPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Disco */}
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">% Disco Occupato</div>
                  <div className="relative w-32 h-32 mx-auto">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-gray-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - systemInfo.diskPercent / 100)}`}
                        className={systemInfo.diskPercent > 80 ? 'text-red-500' : systemInfo.diskPercent > 60 ? 'text-yellow-500' : 'text-green-500'}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{systemInfo.diskPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-center text-sm text-gray-600">
                Tempo di Latenza: {systemInfo.latency.toFixed(3)} ms
              </div>
            </Card.Body>
          </Card>

          {dashboardError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
              Errore nel caricamento dei dati: {dashboardError.message}
            </div>
          )}

          {dashboard?.timestamp && (
            <div className="mt-4 text-sm text-gray-500 text-center">
              Ultimo aggiornamento: {new Date(dashboard.timestamp).toLocaleString('it-IT')}
            </div>
          )}
        </div>
      </AccountLayout>
    );
  }

  // Regular user view (workspace selection) - Only for non-super-admin users
  return (
    <AccountLayout>
      <Meta title="Nextacular - Dashboard" />
      <Content.Title
        title={t('workspace.dashboard.header.title')}
        subtitle={t("workspace.dashboard.header.description")}
      />
      <Content.Divider />
      <Content.Container>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {isFetchingWorkspaces ? (
            <Card>
              <Card.Body />
              <Card.Footer />
            </Card>
          ) : workspacesData?.workspaces.length > 0 ? (
            workspacesData.workspaces.map((workspace, index) => (
              <Card key={index}>
                <Card.Body title={workspace.name} />
                <Card.Footer>
                  <button
                    className="text-blue-600"
                    onClick={() => navigate(workspace)}
                  >
                    Select workspace &rarr;
                  </button>
                </Card.Footer>
              </Card>
            ))
          ) : (
            <Card.Empty>{t('workspace.message.createworkspace')}</Card.Empty>
          )}
        </div>
      </Content.Container>
      <Content.Divider thick />
      <Content.Title
        title={t("workspace.dashboard.header.invitations.title")}
        subtitle={t("workspace.dashboard.header.invitations.description")}
      />
      <Content.Divider />
      <Content.Container>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {isFetchingInvitations ? (
            <Card>
              <Card.Body />
              <Card.Footer />
            </Card>
          ) : invitationsData?.invitations.length > 0 ? (
            invitationsData.invitations.map((invitation, index) => (
              <Card key={index}>
                <Card.Body
                  title={invitation.workspace.name}
                  subtitle={`You have been invited by ${invitation.invitedBy.name || invitation.invitedBy.email
                    }`}
                />
                <Card.Footer>
                  <Button
                    className="text-white bg-blue-600 hover:bg-blue-500"
                    disabled={isSubmitting}
                    onClick={() => accept(invitation.id)}
                  >
                    Accept
                  </Button>
                  <Button
                    className="text-red-600 border border-red-600 hover:bg-red-600 hover:text-white"
                    disabled={isSubmitting}
                    onClick={() => decline(invitation.id)}
                  >
                    Decline
                  </Button>
                </Card.Footer>
              </Card>
            ))
          ) : (
            <Card.Empty>
              {t("workspace.team.invitations.empty.message")}
            </Card.Empty>
          )}
        </div>
      </Content.Container>
    </AccountLayout>
  );
};

export default Welcome;
