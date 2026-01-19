import { useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useTariffs } from '@/hooks/data';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';

const Tariffs = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;
  
  const [filters, setFilters] = useState({
    search: '',
    isActive: undefined,
    page: 1,
    pageSize: 20,
  });

  const { tariffs, total, isLoading, mutate } = useTariffs(workspaceSlug, filters);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (tariffId, tariffName) => {
    if (!confirm(`Are you sure you want to delete "${tariffName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(tariffId);
    try {
      const response = await api(`/api/tariffs/${tariffId}?workspaceSlug=${workspaceSlug}`, {
        method: 'DELETE',
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Tariff deleted successfully');
        mutate(); // Refresh list
      }
    } catch (error) {
      toast.error('Failed to delete tariff');
    } finally {
      setDeletingId(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  if (!workspaceSlug) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Tariffs" />
        <Content.Title title="Tariffs" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | Tariffs`} />
      <Content.Title
        title="Tariff Profiles"
        subtitle="Manage pricing profiles for your charging stations"
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search tariffs..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-4 py-2 border rounded"
            />
            <select
              value={filters.isActive === undefined ? '' : filters.isActive.toString()}
              onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-4 py-2 border rounded"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <Button
            onClick={() => router.push(`/account/${workspaceSlug}/tariffs/new`)}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            + New Tariff
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <Card.Body />
          </Card>
        ) : tariffs.length === 0 ? (
          <Card.Empty>No tariffs found. Create your first tariff profile to get started.</Card.Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price/kWh
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price/Min
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Start Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    MS Fee %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {tariffs.map((tariff) => (
                  <tr key={tariff.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {tariff.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {tariff.basePricePerKwh.toFixed(4)} {tariff.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {tariff.pricePerMinute ? `${tariff.pricePerMinute.toFixed(4)} ${tariff.currency}` : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {tariff.sessionStartFee ? `${tariff.sessionStartFee.toFixed(2)} ${tariff.currency}` : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {(tariff.msFeePercent * 100).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tariff.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {tariff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => router.push(`/account/${workspaceSlug}/tariffs/${tariff.id}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/account/${workspaceSlug}/tariffs/${tariff.id}?edit=true`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tariff.id, tariff.name)}
                        disabled={deletingId === tariff.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === tariff.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > filters.pageSize && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {(filters.page - 1) * filters.pageSize + 1} to {Math.min(filters.page * filters.pageSize, total)} of {total} tariffs
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleFilterChange('page', filters.page - 1)}
                disabled={filters.page === 1}
                className="border border-gray-300 disabled:opacity-50"
              >
                Previous
              </Button>
              <Button
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={filters.page * filters.pageSize >= total}
                className="border border-gray-300 disabled:opacity-50"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Content.Container>
    </AccountLayout>
  );
};

export default Tariffs;
