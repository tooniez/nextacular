import { useRouter } from 'next/router';
import useSWR from 'swr';
import { format } from 'date-fns';
import fetcher from '@/lib/client/fetcher';

import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';

const SessionDetail = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;
  const sessionId = router.query.id;

  const { data, error, isLoading } = useSWR(
    sessionId && workspaceSlug
      ? `/api/sessions/${sessionId}?workspaceSlug=${workspaceSlug}`
      : null,
    {
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000,
    }
  );

  const session = data?.data;

  const formatCurrency = (amount, currency = 'EUR') => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (!workspaceSlug || !sessionId) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Session" />
        <Content.Title title="Session" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  if (isLoading) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Session" />
        <Content.Title title="Session" subtitle="Loading..." />
        <Content.Container>
          <Card>
            <div className="p-8 text-center text-gray-500">Loading session details...</div>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  if (error || !session) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Session" />
        <Content.Title title="Session" subtitle="Error" />
        <Content.Container>
          <Card>
            <div className="p-8 text-center text-red-500">
              {error?.message || 'Session not found'}
            </div>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  const billingBreakdown = session.billingBreakdown || null;
  const hasFinanceAccess = true; // TODO: Check user role (FINANCE/ADMIN/OWNER)

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | Session ${sessionId}`} />
      <Content.Title
        title={`Session Details`}
        subtitle={`Transaction ID: ${session.ocppTransactionId || 'N/A'}`}
      />
      <Content.Divider />
      <Content.Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Session Info */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Session Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs ${
                    session.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : session.status === 'ACTIVE'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {session.status}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Start Time:</span>
                <span className="ml-2">
                  {format(new Date(session.startTime), 'dd/MM/yyyy HH:mm:ss')}
                </span>
              </div>
              {session.endTime && (
                <div>
                  <span className="text-sm text-gray-600">End Time:</span>
                  <span className="ml-2">
                    {format(new Date(session.endTime), 'dd/MM/yyyy HH:mm:ss')}
                  </span>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-600">Duration:</span>
                <span className="ml-2">{formatDuration(session.durationSeconds)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Energy Delivered:</span>
                <span className="ml-2">
                  {session.energyKwh ? `${session.energyKwh.toFixed(2)} kWh` : '—'}
                </span>
              </div>
              {session.stopReason && (
                <div>
                  <span className="text-sm text-gray-600">Stop Reason:</span>
                  <span className="ml-2">{session.stopReason}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Station & Connector */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Station & Connector</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Station:</span>
                <span className="ml-2">{session.station?.name || session.station?.ocppId || '—'}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Connector:</span>
                <span className="ml-2">
                  {session.connector?.connectorId || '—'} ({session.connector?.connectorType || '—'})
                </span>
              </div>
              {session.endUser && (
                <div>
                  <span className="text-sm text-gray-600">End User:</span>
                  <span className="ml-2">
                    {session.endUser.name || '—'} ({session.endUser.email})
                  </span>
                </div>
              )}
              {session.rfidToken && (
                <div>
                  <span className="text-sm text-gray-600">RFID Token:</span>
                  <span className="ml-2">{session.rfidToken}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Billing Breakdown */}
          {billingBreakdown && (
            <Card className="md:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Billing Breakdown</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Energy Amount:</span>
                    <div className="text-lg font-semibold">
                      {formatCurrency(billingBreakdown.components?.energyAmount, billingBreakdown.currency)}
                    </div>
                  </div>
                  {billingBreakdown.components?.timeAmount > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">Time Amount:</span>
                      <div className="text-lg font-semibold">
                        {formatCurrency(billingBreakdown.components.timeAmount, billingBreakdown.currency)}
                      </div>
                    </div>
                  )}
                  {billingBreakdown.components?.sessionStartFeeAmount > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">Start Fee:</span>
                      <div className="text-lg font-semibold">
                        {formatCurrency(billingBreakdown.components.sessionStartFeeAmount, billingBreakdown.currency)}
                      </div>
                    </div>
                  )}
                  {billingBreakdown.components?.idleAmount > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">Idle Fee:</span>
                      <div className="text-lg font-semibold">
                        {formatCurrency(billingBreakdown.components.idleAmount, billingBreakdown.currency)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-lg font-semibold">Gross Amount:</span>
                    <span className="text-xl font-bold">
                      {formatCurrency(billingBreakdown.grossAmount, billingBreakdown.currency)}
                    </span>
                  </div>
                  {hasFinanceAccess && (
                    <>
                      <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                        <span>MSolution Fee ({billingBreakdown.msFeePercent}%):</span>
                        <span>{formatCurrency(billingBreakdown.msFeeAmount, billingBreakdown.currency)}</span>
                      </div>
                      <div className="flex justify-between items-center text-lg font-semibold text-green-600">
                        <span>Sub-CPO Earning:</span>
                        <span>{formatCurrency(billingBreakdown.subCpoEarningAmount, billingBreakdown.currency)}</span>
                      </div>
                    </>
                  )}
                </div>
                {session.billingStatus && (
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">Billing Status:</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs ${
                        session.billingStatus === 'BILLED'
                          ? 'bg-green-100 text-green-800'
                          : session.billingStatus === 'BILLING_ERROR'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {session.billingStatus}
                    </span>
                    {session.billedAt && (
                      <span className="ml-2 text-sm text-gray-600">
                        (Billed at: {format(new Date(session.billedAt), 'dd/MM/yyyy HH:mm:ss')})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {!billingBreakdown && session.status === 'COMPLETED' && (
            <Card className="md:col-span-2">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  Billing information not available. Status: {session.billingStatus || 'NOT_BILLED'}
                </p>
              </div>
            </Card>
          )}
        </div>
      </Content.Container>
    </AccountLayout>
  );
};

export default SessionDetail;
