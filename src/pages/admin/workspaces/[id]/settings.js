import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { fetcher } from '@/lib/client/fetcher';
import AccountLayout from '@/layouts/AccountLayout';
import { useOrganizationsPermission } from '@/hooks/data/useOrganizationsPermission';
import toast from 'react-hot-toast';

export default function AdminWorkspaceSettingsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { hasPermission, isLoading: isAuthLoading } = useOrganizationsPermission();
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const [activeTab, setActiveTab] = useState('economic');
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state - MUST be declared before any conditional returns
  const [formData, setFormData] = useState({
    defaultMsFeePercent: 15.0,
    perSessionStartFeeCents: 0,
    gracePeriodMinutes: 0,
    overstayFeeCentsPerMinute: 0,
    hubjectPriceOverrides: '',
    isActive: true,
    isSuspended: false,
    suspensionReason: '',
    reason: '',
  });

  const { data, error, mutate } = useSWR(
    hasPermission && id ? `/api/admin/workspaces/${id}` : null,
    fetcher
  );

  const { data: historyData } = useSWR(
    hasPermission && id ? `/api/admin/workspaces/${id}/history?page=1&pageSize=20` : null,
    fetcher
  );

  const workspace = data?.data;
  const history = historyData?.data?.data || [];

  // Update form when workspace loads - MUST be after all useState declarations
  useEffect(() => {
    if (workspace) {
      setFormData({
        defaultMsFeePercent: workspace.defaultMsFeePercent || 15.0,
        perSessionStartFeeCents: workspace.perSessionStartFeeCents || 0,
        gracePeriodMinutes: workspace.gracePeriodMinutes || 0,
        overstayFeeCentsPerMinute: workspace.overstayFeeCentsPerMinute || 0,
        hubjectPriceOverrides: workspace.hubjectPriceOverrides || '',
        isActive: workspace.isActive !== false,
        isSuspended: workspace.isSuspended || false,
        suspensionReason: workspace.suspensionReason || '',
        reason: '',
      });
    }
  }, [workspace]);

  // Redirect if no permission - AFTER all hooks
  if (!isAuthLoading && !hasPermission) {
    router.replace('/');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/workspaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Settings updated successfully');
        mutate(); // Refresh data
        setFormData({ ...formData, reason: '' }); // Clear reason
      } else {
        toast.error(result.errors?.validation?.msg || result.errors?.error?.msg || 'Update failed');
      }
    } catch (error) {
      toast.error('Error updating settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <div className="p-8">Loading...</div>
      </AccountLayout>
    );
  }

  if (error || !workspace) {
    return (
      <AccountLayout>
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800">Error loading workspace: {error?.message || 'Not found'}</p>
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <div className="p-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/workspaces')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Workspaces
          </button>
          <h1 className="text-3xl font-bold">{workspace.name}</h1>
          <p className="text-gray-600 mt-2">Workspace Settings - Super Admin</p>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <button
            onClick={() => setActiveTab('economic')}
            className={`px-4 py-2 ${activeTab === 'economic' ? 'border-b-2 border-blue-600' : ''}`}
          >
            Economic Settings
          </button>
          <button
            onClick={() => setActiveTab('operational')}
            className={`px-4 py-2 ${activeTab === 'operational' ? 'border-b-2 border-blue-600' : ''}`}
          >
            Operational Settings
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 ${activeTab === 'history' ? 'border-b-2 border-blue-600' : ''}`}
          >
            Audit History
          </button>
        </div>

        {/* Economic Settings Tab */}
        {activeTab === 'economic' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Default MS Fee % (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.defaultMsFeePercent}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultMsFeePercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Per Session Start Fee (EUR cents)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.perSessionStartFeeCents}
                  onChange={(e) =>
                    setFormData({ ...formData, perSessionStartFeeCents: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Grace Period (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.gracePeriodMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, gracePeriodMinutes: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Overstay Fee (cents/minute)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.overstayFeeCentsPerMinute}
                  onChange={(e) =>
                    setFormData({ ...formData, overstayFeeCentsPerMinute: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Hubject Price Overrides (JSON)
                </label>
                <textarea
                  value={formData.hubjectPriceOverrides}
                  onChange={(e) => setFormData({ ...formData, hubjectPriceOverrides: e.target.value })}
                  className="w-full px-4 py-2 border rounded font-mono text-sm"
                  rows="4"
                  placeholder='{"EMP_123": {"pricePerKwh": 0.40}}'
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for Change (optional)
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                  placeholder="Describe why you're making this change..."
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Economic Settings'}
              </button>
            </div>
          </form>
        )}

        {/* Operational Settings Tab */}
        {activeTab === 'operational' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Workspace is Active</span>
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isSuspended}
                    onChange={(e) => setFormData({ ...formData, isSuspended: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium">Workspace is Suspended</span>
                </label>
              </div>

              {formData.isSuspended && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Suspension Reason
                  </label>
                  <textarea
                    value={formData.suspensionReason}
                    onChange={(e) => setFormData({ ...formData, suspensionReason: e.target.value })}
                    className="w-full px-4 py-2 border rounded"
                    rows="3"
                    placeholder="Reason for suspension..."
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason for Change (optional)
                </label>
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 border rounded"
                  placeholder="Describe why you're making this change..."
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Operational Settings'}
              </button>
            </div>
          </form>
        )}

        {/* Audit History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changed At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changed By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      No history records
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(h.changedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {h.changedBy?.email || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <details className="cursor-pointer">
                          <summary className="text-blue-600">View Changes</summary>
                          <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto">
                            {JSON.stringify({ old: h.oldValues, new: h.newValues }, null, 2)}
                          </pre>
                        </details>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{h.reason || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AccountLayout>
  );
}
