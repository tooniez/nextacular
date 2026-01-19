import { useRouter } from 'next/router';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { usePayout } from '@/hooks/data';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';

const PayoutDetail = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;
  const payoutId = router.query.id;

  const { payout, isLoading, mutate } = usePayout(payoutId, workspaceSlug);

  const formatCurrency = (amount, currency = 'EUR') => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  };

  const handleIssue = async () => {
    if (!confirm('Are you sure you want to issue this payout statement? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api(`/api/payouts/${payoutId}/issue?workspaceSlug=${workspaceSlug}`, {
        method: 'POST',
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Payout statement issued successfully');
        mutate();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to issue payout statement');
    }
  };

  const handleMarkPaid = async () => {
    const paidAt = prompt('Enter payment date (YYYY-MM-DD) or leave empty for today:');
    if (paidAt === null) return;

    const reference = prompt('Enter payment reference (optional):') || null;

    try {
      const response = await api(`/api/payouts/${payoutId}/mark-paid?workspaceSlug=${workspaceSlug}`, {
        method: 'POST',
        body: {
          paidAt: paidAt || new Date().toISOString(),
          reference,
        },
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Payout marked as paid');
        mutate();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to mark payout as paid');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this payout statement? This will remove it from sessions.')) {
      return;
    }

    try {
      const response = await api(`/api/payouts/${payoutId}/cancel?workspaceSlug=${workspaceSlug}`, {
        method: 'POST',
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Payout statement cancelled');
        mutate();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to cancel payout statement');
    }
  };

  if (!workspaceSlug || !payoutId) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Payout" />
        <Content.Title title="Payout" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  if (isLoading) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Payout" />
        <Content.Title title="Payout" subtitle="Loading..." />
        <Content.Container>
          <Card>
            <div className="p-8 text-center text-gray-500">Loading payout statement...</div>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  if (!payout) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Payout" />
        <Content.Title title="Payout" subtitle="Not Found" />
        <Content.Container>
          <Card>
            <div className="p-8 text-center text-red-500">Payout statement not found</div>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | Payout ${payoutId}`} />
      <Content.Title
        title={`Payout Statement`}
        subtitle={`Period: ${format(new Date(payout.periodStart), 'dd/MM/yyyy')} - ${format(new Date(payout.periodEnd), 'dd/MM/yyyy')}`}
      />
      <Content.Divider />
      <Content.Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Statement Summary */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Statement Summary</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Status:</span>
                <span
                  className={`ml-2 px-2 py-1 rounded text-xs ${
                    payout.status === 'PAID'
                      ? 'bg-green-100 text-green-800'
                      : payout.status === 'ISSUED'
                      ? 'bg-blue-100 text-blue-800'
                      : payout.status === 'DRAFT'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {payout.status}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Sessions:</span>
                <span className="ml-2 font-semibold">{payout.totalSessions}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Total Energy:</span>
                <span className="ml-2 font-semibold">{payout.totalEnergyKwh.toFixed(2)} kWh</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Gross Amount:</span>
                <span className="ml-2 font-semibold">{formatCurrency(payout.totalGrossAmount, payout.currency)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">MS Fee:</span>
                <span className="ml-2">{formatCurrency(payout.totalMsFeeAmount, payout.currency)}</span>
              </div>
              <div className="border-t pt-2">
                <span className="text-sm text-gray-600">Sub-CPO Earning:</span>
                <span className="ml-2 text-lg font-bold text-green-600">
                  {formatCurrency(payout.totalSubCpoEarning, payout.currency)}
                </span>
              </div>
              {payout.payoutDate && (
                <div>
                  <span className="text-sm text-gray-600">Paid Date:</span>
                  <span className="ml-2">{format(new Date(payout.payoutDate), 'dd/MM/yyyy')}</span>
                </div>
              )}
              {payout.payoutReference && (
                <div>
                  <span className="text-sm text-gray-600">Reference:</span>
                  <span className="ml-2">{payout.payoutReference}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          <Card>
            <h3 className="text-lg font-semibold mb-4">Actions</h3>
            <div className="space-y-2">
              <a
                href={`/api/payouts/${payoutId}/export.csv?workspaceSlug=${workspaceSlug}`}
                className="block w-full px-4 py-2 text-center text-white bg-green-600 hover:bg-green-500 rounded"
                download
              >
                Export CSV
              </a>
              {payout.status === 'DRAFT' && (
                <Button
                  className="w-full text-white bg-blue-600 hover:bg-blue-500"
                  onClick={handleIssue}
                >
                  Issue Statement
                </Button>
              )}
              {payout.status === 'ISSUED' && (
                <Button
                  className="w-full text-white bg-green-600 hover:bg-green-500"
                  onClick={handleMarkPaid}
                >
                  Mark as Paid
                </Button>
              )}
              {(payout.status === 'DRAFT' || payout.status === 'ISSUED') && (
                <Button
                  className="w-full text-white bg-red-600 hover:bg-red-500"
                  onClick={handleCancel}
                >
                  Cancel Statement
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Line Items ({payout.lineItems?.length || 0})</h3>
          {payout.lineItems && payout.lineItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Session ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Station</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Started</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Energy (kWh)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Gross</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">MS Fee</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Sub-CPO</th>
                  </tr>
                </thead>
                <tbody>
                  {payout.lineItems.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-xs">{item.sessionId.substring(0, 8)}...</td>
                      <td className="px-4 py-3 text-sm">{item.stationName}</td>
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(item.sessionStartTime), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-sm">{item.energyKwh.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(item.grossAmount, item.currency)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(item.msFeeAmount, item.currency)}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCurrency(item.subCpoEarning, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">No line items</div>
          )}
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default PayoutDetail;
