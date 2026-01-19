import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { fetcher } from '@/lib/client/fetcher';
import AccountLayout from '@/layouts/AccountLayout';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';

export default function AdminWorkspacesPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, error, mutate } = useSWR(
    isSuperAdmin ? `/api/admin/workspaces?status=${statusFilter}&search=${search}&page=1&pageSize=20` : null,
    fetcher
  );

  // Redirect if not Super Admin
  if (!isAuthLoading && !isSuperAdmin) {
    router.replace('/');
    return null;
  }

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <div className="p-8">Loading...</div>
      </AccountLayout>
    );
  }

  const workspaces = data?.data?.data || [];
  const pagination = data?.data?.pagination || {};

  return (
    <AccountLayout>
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Super Admin - Workspaces Management</h1>
          <p className="text-gray-600 mt-2">Gestisci workspaces (Sub-CPO) e parametri economici</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <input
            type="text"
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border rounded flex-1"
          />
        </div>

        {/* Workspaces Table */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800">Error loading workspaces: {error.message}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MS Fee %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workspaces.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No workspaces found
                    </td>
                  </tr>
                ) : (
                  workspaces.map((ws) => (
                    <tr key={ws.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{ws.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ws.slug}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            ws.isSuspended
                              ? 'bg-red-100 text-red-800'
                              : ws.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {ws.isSuspended ? 'Suspended' : ws.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{ws.defaultMsFeePercent || 15.0}%</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(ws.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/admin/workspaces/${ws.id}/settings`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Settings
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              disabled={pagination.page === 1}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
