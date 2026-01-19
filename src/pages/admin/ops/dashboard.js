import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { fetcher } from '@/lib/client/fetcher';
import AccountLayout from '@/layouts/AccountLayout';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';

export default function OperationsDashboardPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // #region agent log - debug page load
  useEffect(() => {
    console.log('[DEBUG] OperationsDashboardPage mounted', {
      isSuperAdmin,
      isAuthLoading,
      timestamp: Date.now(),
    });
  }, [isSuperAdmin, isAuthLoading]);
  // #endregion

  const { data: kpiData, error, mutate } = useSWR(
    isSuperAdmin ? '/api/admin/ops/dashboard' : null,
    fetcher,
    {
      refreshInterval: autoRefresh ? 30000 : 0, // 30 seconds
      onError: (err) => {
        console.error('[DEBUG] Dashboard API error:', err);
      },
      onSuccess: (data) => {
        console.log('[DEBUG] Dashboard API success:', { hasData: !!data, timestamp: Date.now() });
      },
    }
  );

  const { data: alertStats, error: alertError } = useSWR(
    isSuperAdmin ? '/api/admin/ops/alerts?stats=true' : null,
    fetcher,
    {
      refreshInterval: autoRefresh ? 30000 : 0,
      onError: (err) => {
        console.error('[DEBUG] Alerts API error:', err);
      },
    }
  );

  // #region agent log - debug errors
  useEffect(() => {
    if (error) {
      console.error('[DEBUG] Dashboard error:', error);
    }
    if (alertError) {
      console.error('[DEBUG] Alerts error:', alertError);
    }
  }, [error, alertError]);
  // #endregion

  // Redirect if not Super Admin
  if (!isAuthLoading && !isSuperAdmin) {
    router.replace('/');
    return null;
  }

  const kpi = kpiData?.data;
  const stats = alertStats?.data;

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <div className="p-8">Loading...</div>
      </AccountLayout>
    );
  }

  if (error) {
    // #region agent log - debug error display
    console.error('[DEBUG] Dashboard error in UI:', {
      error,
      message: error?.message,
      timestamp: Date.now(),
    });
    // #endregion

    return (
      <AccountLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800 font-semibold">Error loading dashboard</p>
            <p className="text-red-600 mt-2">{error.message || 'Unknown error'}</p>
            <p className="text-sm text-gray-600 mt-4">
              Note: If this is the first time accessing Operations Dashboard, you may need to apply the database migration.
              Check the browser console for more details.
            </p>
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="p-8">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Operations Dashboard</h1>
            <p className="text-gray-600 mt-2">Real-time platform monitoring and KPI</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Auto-refresh (30s)</span>
            </label>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Alert Summary */}
        {stats && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Total Alerts</div>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Open Alerts</div>
              <div className="text-2xl font-bold text-yellow-800">{stats.open || 0}</div>
            </div>
            <div className="bg-red-50 rounded-lg shadow p-4">
              <div className="text-sm text-gray-600">Critical Alerts</div>
              <div className="text-2xl font-bold text-red-800">{stats.critical || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <button
                onClick={() => router.push('/admin/ops/alerts')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All Alerts →
              </button>
            </div>
          </div>
        )}

        {!kpi ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">Loading KPI...</p>
            <p className="text-sm text-gray-500 mt-2">
              {isSuperAdmin ? 'Waiting for data...' : 'Checking permissions...'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stations Health */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Stations Health</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold">{kpi.stations?.total || 0}</div>
                </div>
                <div className="text-green-600">
                  <div className="text-sm">Online</div>
                  <div className="text-2xl font-bold">{kpi.stations?.online || 0}</div>
                  <div className="text-xs">({kpi.stations?.onlinePercent?.toFixed(1) || 0}%)</div>
                </div>
                <div className="text-red-600">
                  <div className="text-sm">Offline</div>
                  <div className="text-2xl font-bold">{kpi.stations?.offline || 0}</div>
                  <div className="text-xs">({kpi.stations?.offlinePercent?.toFixed(1) || 0}%)</div>
                </div>
                <div className="text-yellow-600">
                  <div className="text-sm">Degraded</div>
                  <div className="text-2xl font-bold">{kpi.stations?.degraded || 0}</div>
                  <div className="text-xs">({kpi.stations?.degradedPercent?.toFixed(1) || 0}%)</div>
                </div>
                <div className="text-orange-600">
                  <div className="text-sm">Faulted</div>
                  <div className="text-2xl font-bold">{kpi.stations?.faulted || 0}</div>
                  <div className="text-xs">({kpi.stations?.faultedPercent?.toFixed(1) || 0}%)</div>
                </div>
              </div>
            </div>

            {/* Connectors Health */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Connectors Health</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold">{kpi.connectors?.total || 0}</div>
                </div>
                <div className="text-green-600">
                  <div className="text-sm">Available</div>
                  <div className="text-2xl font-bold">{kpi.connectors?.available || 0}</div>
                  <div className="text-xs">({kpi.connectors?.availablePercent?.toFixed(1) || 0}%)</div>
                </div>
                <div className="text-blue-600">
                  <div className="text-sm">Charging</div>
                  <div className="text-2xl font-bold">{kpi.connectors?.charging || 0}</div>
                  <div className="text-xs">({kpi.connectors?.chargingPercent?.toFixed(1) || 0}%)</div>
                </div>
                <div className="text-red-600">
                  <div className="text-sm">Faulted</div>
                  <div className="text-2xl font-bold">{kpi.connectors?.faulted || 0}</div>
                  <div className="text-xs">({kpi.connectors?.faultedPercent?.toFixed(1) || 0}%)</div>
                </div>
              </div>
            </div>

            {/* Sessions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Sessions</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Active</div>
                  <div className="text-2xl font-bold">{kpi.sessions?.active || 0}</div>
                </div>
                <div className={kpi.sessions?.pendingStop > 0 ? 'text-yellow-600' : ''}>
                  <div className="text-sm">Pending Stop (&gt;30min)</div>
                  <div className="text-2xl font-bold">{kpi.sessions?.pendingStop || 0}</div>
                </div>
              </div>
            </div>

            {/* Payments */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Payment Failures (24h)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total Attempts</div>
                  <div className="text-2xl font-bold">{kpi.payments?.total || 0}</div>
                </div>
                <div className={kpi.payments?.holdFailedRate > 5 ? 'text-red-600' : ''}>
                  <div className="text-sm">HOLD Failed</div>
                  <div className="text-2xl font-bold">{kpi.payments?.holdFailed || 0}</div>
                  <div className="text-xs">({kpi.payments?.holdFailedRate?.toFixed(2) || 0}%)</div>
                </div>
                <div className={kpi.payments?.captureFailedRate > 2 ? 'text-red-600' : ''}>
                  <div className="text-sm">CAPTURE Failed</div>
                  <div className="text-2xl font-bold">{kpi.payments?.captureFailed || 0}</div>
                  <div className="text-xs">({kpi.payments?.captureFailedRate?.toFixed(2) || 0}%)</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Total Failures</div>
                  <div className="text-2xl font-bold">{kpi.payments?.totalFailures || 0}</div>
                </div>
              </div>
            </div>

            {/* Roaming */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Roaming Clearing (30 days)</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold">{kpi.roaming?.total || 0}</div>
                </div>
                <div>
                  <div className="text-sm">Pending</div>
                  <div className="text-2xl font-bold">{kpi.roaming?.pending || 0}</div>
                </div>
                <div className={kpi.roaming?.pendingOld > 0 ? 'text-yellow-600' : ''}>
                  <div className="text-sm">Pending &gt;7d</div>
                  <div className="text-2xl font-bold">{kpi.roaming?.pendingOld || 0}</div>
                </div>
                <div className="text-green-600">
                  <div className="text-sm">Settled</div>
                  <div className="text-2xl font-bold">{kpi.roaming?.settled || 0}</div>
                  <div className="text-xs">({kpi.roaming?.settledRate?.toFixed(1) || 0}%)</div>
                </div>
                <div className={kpi.roaming?.disputeRate > 5 ? 'text-red-600' : ''}>
                  <div className="text-sm">Disputed</div>
                  <div className="text-2xl font-bold">{kpi.roaming?.disputed || 0}</div>
                  <div className="text-xs">({kpi.roaming?.disputeRate?.toFixed(1) || 0}%)</div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push('/admin/ops/alerts')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Alerts
                </button>
                <button
                  onClick={() => router.push('/admin/ops/events')}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Event Timeline
                </button>
                <button
                  onClick={() => router.push('/admin/ops/health')}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Health Check
                </button>
                <button
                  onClick={() => router.push('/admin/platform/settings')}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Platform Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {kpi?.timestamp && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Last updated: {new Date(kpi.timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
