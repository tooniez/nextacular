import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { format } from 'date-fns';

import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useSessions } from '@/hooks/data';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';

const Sessions = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;

  const [filters, setFilters] = useState({
    status: '',
    stationId: '',
    from: '',
    to: '',
    page: 1,
    pageSize: 20,
  });

  const { sessions, pagination, isLoading } = useSessions(workspaceSlug, filters);

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

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!workspaceSlug) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Sessions" />
        <Content.Title title="Sessions" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | Sessions`} />
      <Content.Title
        title="Charging Sessions"
        subtitle="View and manage charging sessions"
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
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
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
        </div>

        {isLoading ? (
          <Card>
            <div className="p-8 text-center text-gray-500">Loading sessions...</div>
          </Card>
        ) : sessions.length === 0 ? (
          <Card>
            <div className="p-8 text-center text-gray-500">No sessions found</div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left text-sm font-semibold">Start Time</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Station</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Connector</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Energy (kWh)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {format(new Date(session.startTime), 'dd/MM/yyyy HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {session.station?.name || session.station?.ocppId || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {session.connector?.connectorId || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {session.energyKwh ? session.energyKwh.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDuration(session.durationSeconds)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            session.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : session.status === 'ACTIVE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {session.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatCurrency(session.grossAmount, session.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/account/${workspaceSlug}/sessions/${session.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          View
                        </Link>
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
    </AccountLayout>
  );
};

export default Sessions;
