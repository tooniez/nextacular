import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Modal from '@/components/Modal/index';
import { usePayouts } from '@/hooks/data';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';

const Payouts = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;

  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: '',
    page: 1,
    pageSize: 20,
  });

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preview, setPreview] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    periodStart: '',
    periodEnd: '',
  });

  const { payouts, pagination, isLoading, mutate } = usePayouts(workspaceSlug, filters);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const formatCurrency = (amount, currency = 'EUR') => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: currency || 'EUR',
    }).format(amount);
  };

  const handlePreview = async () => {
    if (!generateForm.periodStart || !generateForm.periodEnd) {
      toast.error('Please select both start and end dates');
      return;
    }

    setIsLoadingPreview(true);
    try {
      const response = await api(`/api/payouts/preview?workspaceSlug=${workspaceSlug}`, {
        method: 'POST',
        body: {
          periodStart: generateForm.periodStart,
          periodEnd: generateForm.periodEnd,
        },
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        setPreview(response.data);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to generate preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.periodStart || !generateForm.periodEnd) {
      toast.error('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await api(`/api/payouts?workspaceSlug=${workspaceSlug}`, {
        method: 'POST',
        body: {
          periodStart: generateForm.periodStart,
          periodEnd: generateForm.periodEnd,
        },
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Payout statement created successfully');
        setShowGenerateModal(false);
        setGenerateForm({ periodStart: '', periodEnd: '' });
        setPreview(null);
        mutate();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create payout statement');
    } finally {
      setIsGenerating(false);
    }
  };

  const getPresetDates = (preset) => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    if (preset === 'thisMonth') {
      return {
        periodStart: format(firstDay, 'yyyy-MM-dd'),
        periodEnd: format(lastDay, 'yyyy-MM-dd'),
      };
    } else if (preset === 'lastMonth') {
      const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        periodStart: format(lastMonthFirst, 'yyyy-MM-dd'),
        periodEnd: format(lastMonthLast, 'yyyy-MM-dd'),
      };
    }
    return { periodStart: '', periodEnd: '' };
  };

  if (!workspaceSlug) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Payouts" />
        <Content.Title title="Payouts" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | Payouts`} />
      <Content.Title
        title="Payout Statements"
        subtitle="View and manage payout statements"
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <select
              className="px-3 py-2 border rounded"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <input
              type="date"
              className="px-3 py-2 border rounded"
              value={filters.from}
              onChange={(e) => handleFilterChange('from', e.target.value)}
              placeholder="From date"
            />
            <input
              type="date"
              className="px-3 py-2 border rounded"
              value={filters.to}
              onChange={(e) => handleFilterChange('to', e.target.value)}
              placeholder="To date"
            />
          </div>
          <Button
            className="text-white bg-blue-600 hover:bg-blue-500"
            onClick={() => setShowGenerateModal(true)}
          >
            Generate Statement
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <div className="p-8 text-center text-gray-500">Loading payout statements...</div>
          </Card>
        ) : !payouts || (Array.isArray(payouts) && payouts.length === 0) ? (
          <Card>
            <div className="p-8 text-center text-gray-500">
              No payout statements found. Generate a statement to get started.
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Period</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Sessions</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Energy (kWh)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Sub-CPO Earning</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(payout.periodStart), 'dd/MM/yyyy')} - {format(new Date(payout.periodEnd), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
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
                      </td>
                      <td className="px-4 py-3 text-sm">{payout.totalSessions}</td>
                      <td className="px-4 py-3 text-sm">{payout.totalEnergyKwh.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCurrency(payout.totalSubCpoEarning, payout.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(payout.createdAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/account/${workspaceSlug}/payouts/${payout.id}`}
                          className="text-blue-600 hover:underline mr-3"
                        >
                          View
                        </Link>
                        <a
                          href={`/api/payouts/${payout.id}/export.csv?workspaceSlug=${workspaceSlug}`}
                          className="text-green-600 hover:underline"
                          download
                        >
                          CSV
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.totalPages > 1 && (
              <div className="flex justify-between items-center mt-4 px-4 py-3 border-t">
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 border rounded disabled:opacity-50"
                    disabled={pagination.page === 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Previous
                  </button>
                  <button
                    className="px-3 py-1 border rounded disabled:opacity-50"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}
      </Content.Container>

      {/* Generate Statement Modal */}
      <Modal show={showGenerateModal} title="Generate Payout Statement" toggle={() => {
        setShowGenerateModal(false);
        setPreview(null);
        setGenerateForm({ periodStart: '', periodEnd: '' });
      }}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Preset Periods</label>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                onClick={() => {
                  const dates = getPresetDates('thisMonth');
                  setGenerateForm(dates);
                }}
              >
                This Month
              </button>
              <button
                type="button"
                className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                onClick={() => {
                  const dates = getPresetDates('lastMonth');
                  setGenerateForm(dates);
                }}
              >
                Last Month
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Period Start</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              value={generateForm.periodStart}
              onChange={(e) => setGenerateForm((prev) => ({ ...prev, periodStart: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Period End</label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded"
              value={generateForm.periodEnd}
              onChange={(e) => setGenerateForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
            />
          </div>
          <div className="flex gap-2">
            <Button
              className="text-white bg-gray-600 hover:bg-gray-500"
              onClick={handlePreview}
              disabled={isLoadingPreview || !generateForm.periodStart || !generateForm.periodEnd}
            >
              {isLoadingPreview ? 'Loading...' : 'Preview'}
            </Button>
            <Button
              className="text-white bg-blue-600 hover:bg-blue-500"
              onClick={handleGenerate}
              disabled={isGenerating || !preview}
            >
              {isGenerating ? 'Creating...' : 'Create Statement'}
            </Button>
          </div>
          {preview && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h4 className="font-semibold mb-2">Preview</h4>
              <div className="text-sm space-y-1">
                <div>Sessions: {preview.totals.totalSessions}</div>
                <div>Energy: {preview.totals.totalEnergyKwh.toFixed(2)} kWh</div>
                <div>Gross Amount: {formatCurrency(preview.totals.totalGrossAmount, preview.totals.currency)}</div>
                <div>MS Fee: {formatCurrency(preview.totals.totalMsFeeAmount, preview.totals.currency)}</div>
                <div className="font-semibold">Sub-CPO Earning: {formatCurrency(preview.totals.totalSubCpoEarning, preview.totals.currency)}</div>
                {preview.lineItems && preview.lineItems.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    Showing {preview.lineItems.length} of {preview.lineItemsCount} line items
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AccountLayout>
  );
};

export default Payouts;
