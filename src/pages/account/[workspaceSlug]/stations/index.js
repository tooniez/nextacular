import { useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useStations } from '@/hooks/data';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';

const Stations = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    city: '',
    page: 1,
    pageSize: 20,
  });

  const { stations, total, isLoading, mutate } = useStations(workspaceSlug, filters);
  
  // #region agent log
  if (typeof window !== 'undefined') {
    console.log('[Stations Page] Render:', { 
      workspaceSlug, 
      hasWorkspace: !!workspace,
      workspaceSlugFromWorkspace: workspace?.slug,
      workspaceSlugFromRouter: router.query.workspaceSlug,
      stationsCount: stations?.length || 0,
      isLoading,
      total
    });
  }
  // #endregion
  
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (stationId, stationName) => {
    if (!confirm(`Are you sure you want to delete "${stationName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(stationId);
    try {
      const response = await api(`/api/stations/${stationId}?workspaceSlug=${workspaceSlug}`, {
        method: 'DELETE',
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Station deleted successfully');
        mutate(); // Refresh list
      }
    } catch (error) {
      toast.error('Failed to delete station');
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
        <Meta title="Nextacular - Stations" />
        <Content.Title title="Stations" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | Stations`} />
      <Content.Title
        title="Charging Stations"
        subtitle="Manage your charging stations"
      />
      <Content.Divider />
      <Content.Container>
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search stations..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="px-4 py-2 border rounded"
            />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-4 py-2 border rounded"
            >
              <option value="">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="CHARGING">Charging</option>
              <option value="OFFLINE">Offline</option>
              <option value="FAULTED">Faulted</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </div>
          <Button
            onClick={() => router.push(`/account/${workspaceSlug}/stations/new`)}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            + Add Station
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <div className="p-8 text-center text-gray-500">Loading stations...</div>
          </Card>
        ) : !stations || (Array.isArray(stations) && stations.length === 0) ? (
          <Card.Empty>No stations found. Create your first station to get started.</Card.Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    OCPP ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Connectors
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {stations.map((station) => (
                  <tr key={station.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {station.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {station.ocppId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {station.location || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          station.status === 'AVAILABLE'
                            ? 'bg-green-100 text-green-800'
                            : station.status === 'CHARGING'
                            ? 'bg-blue-100 text-blue-800'
                            : station.status === 'OFFLINE'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {station.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {station.connectorsCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => router.push(`/account/${workspaceSlug}/stations/${station.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </button>
                      <button
                        onClick={() => router.push(`/account/${workspaceSlug}/stations/${station.id}?edit=true`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(station.id, station.name)}
                        disabled={deletingId === station.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deletingId === station.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > filters.pageSize && (
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Showing {((filters.page - 1) * filters.pageSize) + 1} to {Math.min(filters.page * filters.pageSize, total)} of {total} stations
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
                className="px-4 py-2"
              >
                Previous
              </Button>
              <Button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page * filters.pageSize >= total}
                className="px-4 py-2"
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

export default Stations;
