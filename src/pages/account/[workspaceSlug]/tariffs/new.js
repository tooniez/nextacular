import { useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';

const NewTariff = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;

  const [isSubmitting, setSubmittingState] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    basePricePerKwh: '',
    pricePerMinute: '',
    sessionStartFee: '',
    currency: 'EUR',
    msFeePercent: '',
    isActive: true,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmittingState(true);

    try {
      const response = await api(`/api/tariffs?workspaceSlug=${workspaceSlug}`, {
        method: 'POST',
        body: {
          name: formData.name,
          basePricePerKwh: parseFloat(formData.basePricePerKwh),
          pricePerMinute: formData.pricePerMinute ? parseFloat(formData.pricePerMinute) : 0,
          sessionStartFee: formData.sessionStartFee ? parseFloat(formData.sessionStartFee) : 0,
          currency: formData.currency,
          msFeePercent: parseFloat(formData.msFeePercent) / 100, // Convert % to decimal (e.g., 15% = 0.15)
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
        toast.success('Tariff created successfully');
        router.push(`/account/${workspaceSlug}/tariffs/${response.data.id}`);
      }
    } catch (error) {
      toast.error('Failed to create tariff');
    } finally {
      setSubmittingState(false);
    }
  };

  if (!workspaceSlug) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - New Tariff" />
        <Content.Title title="New Tariff" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | New Tariff`} />
      <Content.Title
        title="New Tariff Profile"
        subtitle="Create a new pricing profile for your charging stations"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="e.g., Standard Pricing"
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
                    placeholder="e.g., 0.3500"
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
                    placeholder="e.g., 0.0100"
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
                    placeholder="e.g., 1.50"
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
                    placeholder="e.g., 15.0"
                  />
                  <span className="text-gray-500">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  MSolution fee percentage (e.g., 15.0 = 15%)
                </p>
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
                  onClick={() => router.push(`/account/${workspaceSlug}/tariffs`)}
                  className="border border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name || !formData.basePricePerKwh || !formData.msFeePercent}
                  className="bg-blue-600 text-white hover:bg-blue-500"
                >
                  {isSubmitting ? 'Creating...' : 'Create Tariff'}
                </Button>
              </Card.Footer>
            </form>
          </Card.Body>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default NewTariff;
