import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useTariff } from '@/hooks/data';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';

const TariffDetail = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { id, edit } = router.query;
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;
  
  const [isEditing, setIsEditing] = useState(edit === 'true');
  const [isSubmitting, setSubmittingState] = useState(false);
  const { tariff, isLoading: tariffLoading, mutate: mutateTariff } = useTariff(workspaceSlug, id);

  const [formData, setFormData] = useState({
    name: '',
    basePricePerKwh: '',
    pricePerMinute: '',
    sessionStartFee: '',
    currency: 'EUR',
    msFeePercent: '',
    isActive: true,
    validFrom: '',
    validUntil: '',
  });

  // Update form data when tariff loads
  useEffect(() => {
    if (tariff) {
      setFormData({
        name: tariff.name || '',
        basePricePerKwh: tariff.basePricePerKwh?.toString() || '',
        pricePerMinute: tariff.pricePerMinute?.toString() || '',
        sessionStartFee: tariff.sessionStartFee?.toString() || '',
        currency: tariff.currency || 'EUR',
        msFeePercent: tariff.msFeePercent ? (tariff.msFeePercent * 100).toString() : '',
        isActive: tariff.isActive !== undefined ? tariff.isActive : true,
        validFrom: tariff.validFrom ? new Date(tariff.validFrom).toISOString().split('T')[0] : '',
        validUntil: tariff.validUntil ? new Date(tariff.validUntil).toISOString().split('T')[0] : '',
      });
    }
  }, [tariff]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleUpdateTariff = async (e) => {
    e.preventDefault();
    setSubmittingState(true);

    try {
      const response = await api(`/api/tariffs/${id}?workspaceSlug=${workspaceSlug}`, {
        method: 'PATCH',
        body: {
          name: formData.name,
          basePricePerKwh: formData.basePricePerKwh ? parseFloat(formData.basePricePerKwh) : undefined,
          pricePerMinute: formData.pricePerMinute ? parseFloat(formData.pricePerMinute) : 0,
          sessionStartFee: formData.sessionStartFee ? parseFloat(formData.sessionStartFee) : 0,
          currency: formData.currency,
          msFeePercent: formData.msFeePercent ? parseFloat(formData.msFeePercent) / 100 : undefined,
          isActive: formData.isActive,
          validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
          validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
        },
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Tariff updated successfully');
        setIsEditing(false);
        mutateTariff();
        router.replace(`/account/${workspaceSlug}/tariffs/${id}`);
      }
    } catch (error) {
      toast.error('Failed to update tariff');
    } finally {
      setSubmittingState(false);
    }
  };

  const handleDeleteTariff = async () => {
    if (!confirm(`Are you sure you want to delete "${tariff?.name}"? This action cannot be undone.`)) {
      return;
    }

    setSubmittingState(true);
    try {
      const response = await api(`/api/tariffs/${id}?workspaceSlug=${workspaceSlug}`, {
        method: 'DELETE',
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Tariff deleted successfully');
        router.push(`/account/${workspaceSlug}/tariffs`);
      }
    } catch (error) {
      toast.error('Failed to delete tariff');
    } finally {
      setSubmittingState(false);
    }
  };

  if (!workspaceSlug || !id) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Tariff" />
        <Content.Title title="Tariff" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  if (tariffLoading) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Tariff" />
        <Content.Title title="Tariff" subtitle="Loading..." />
        <Card>
          <Card.Body />
        </Card>
      </AccountLayout>
    );
  }

  if (!tariff) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Tariff Not Found" />
        <Content.Title title="Tariff Not Found" subtitle="The tariff you're looking for doesn't exist." />
        <Content.Container>
          <Button onClick={() => router.push(`/account/${workspaceSlug}/tariffs`)}>
            Back to Tariffs
          </Button>
        </Content.Container>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | ${tariff.name}`} />
      <Content.Title
        title={tariff.name}
        subtitle={`Tariff Profile`}
      />
      <Content.Divider />
      
      <Content.Container>
        <Card>
          <Card.Body>
            {isEditing ? (
              <form onSubmit={handleUpdateTariff} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Base Price per kWh <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="basePricePerKwh"
                      value={formData.basePricePerKwh}
                      onChange={handleChange}
                      required
                      step="0.0001"
                      min="0"
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Currency</label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Price per Minute (optional)</label>
                    <input
                      type="number"
                      name="pricePerMinute"
                      value={formData.pricePerMinute}
                      onChange={handleChange}
                      step="0.0001"
                      min="0"
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Session Start Fee (optional)</label>
                    <input
                      type="number"
                      name="sessionStartFee"
                      value={formData.sessionStartFee}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    MS Fee Percentage <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="msFeePercent"
                      value={formData.msFeePercent}
                      onChange={handleChange}
                      required
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border rounded"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Valid From</label>
                    <input
                      type="date"
                      name="validFrom"
                      value={formData.validFrom}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Valid Until (optional)</label>
                    <input
                      type="date"
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Active</span>
                  </label>
                </div>

                <Card.Footer>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      router.replace(`/account/${workspaceSlug}/tariffs/${id}`);
                    }}
                    className="border border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !formData.name || !formData.basePricePerKwh || !formData.msFeePercent}
                    className="bg-blue-600 text-white hover:bg-blue-500"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </Card.Footer>
              </form>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <div className="mt-1 text-lg">{tariff.name}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Base Price per kWh</label>
                      <div className="mt-1 text-lg">
                        {tariff.basePricePerKwh.toFixed(4)} {tariff.currency}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Currency</label>
                      <div className="mt-1 text-lg">{tariff.currency}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Price per Minute</label>
                      <div className="mt-1">
                        {tariff.pricePerMinute ? `${tariff.pricePerMinute.toFixed(4)} ${tariff.currency}` : '—'}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Session Start Fee</label>
                      <div className="mt-1">
                        {tariff.sessionStartFee ? `${tariff.sessionStartFee.toFixed(2)} ${tariff.currency}` : '—'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">MS Fee Percentage</label>
                    <div className="mt-1 text-lg">{(tariff.msFeePercent * 100).toFixed(1)}%</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tariff.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {tariff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Valid From</label>
                      <div className="mt-1">
                        {new Date(tariff.validFrom).toLocaleDateString()}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Valid Until</label>
                      <div className="mt-1">
                        {tariff.validUntil ? new Date(tariff.validUntil).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Version</label>
                    <div className="mt-1">{tariff.version}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <div className="mt-1">
                      {new Date(tariff.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {tariff.assignments && tariff.assignments.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Assignments</label>
                      <div className="mt-1">
                        <p className="text-sm text-gray-600">
                          This tariff is assigned to {tariff.assignments.length} station(s) or connector(s)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Card.Footer>
                  <Button
                    onClick={() => {
                      setIsEditing(true);
                      router.push(`/account/${workspaceSlug}/tariffs/${id}?edit=true`);
                    }}
                    className="bg-blue-600 text-white hover:bg-blue-500"
                  >
                    Edit Tariff
                  </Button>
                  <Button
                    onClick={handleDeleteTariff}
                    disabled={isSubmitting}
                    className="bg-red-600 text-white hover:bg-red-500"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete Tariff'}
                  </Button>
                </Card.Footer>
              </>
            )}
          </Card.Body>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default TariffDetail;
