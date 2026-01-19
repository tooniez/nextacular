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

const NewStation = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;
  
  const [isSubmitting, setSubmittingState] = useState(false);
  const [formData, setFormData] = useState({
    ocppId: '',
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    ocppVersion: '2.0.1',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmittingState(true);

    try {
      const response = await api(`/api/stations?workspaceSlug=${workspaceSlug}`, {
        method: 'POST',
        body: formData,
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Station created successfully');
        router.push(`/account/${workspaceSlug}/stations/${response.data.id}`);
      }
    } catch (error) {
      toast.error('Failed to create station');
    } finally {
      setSubmittingState(false);
    }
  };

  if (!workspaceSlug) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - New Station" />
        <Content.Title title="New Station" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | New Station`} />
      <Content.Title
        title="Add Charging Station"
        subtitle="Create a new charging station"
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  OCPP ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ocppId"
                  value={formData.ocppId}
                  onChange={handleChange}
                  required
                  maxLength={64}
                  className="w-full px-4 py-2 border rounded"
                  placeholder="e.g., CP001"
                />
              </div>

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
                  placeholder="e.g., Station Main Square"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  maxLength={200}
                  className="w-full px-4 py-2 border rounded"
                  placeholder="e.g., Via Roma 1, Milano"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Latitude</label>
                  <input
                    type="number"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleChange}
                    step="any"
                    min="-90"
                    max="90"
                    className="w-full px-4 py-2 border rounded"
                    placeholder="e.g., 45.4642"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Longitude</label>
                  <input
                    type="number"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleChange}
                    step="any"
                    min="-180"
                    max="180"
                    className="w-full px-4 py-2 border rounded"
                    placeholder="e.g., 9.1900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">OCPP Version</label>
                <input
                  type="text"
                  name="ocppVersion"
                  value={formData.ocppVersion}
                  onChange={handleChange}
                  maxLength={20}
                  className="w-full px-4 py-2 border rounded"
                  placeholder="e.g., 2.0.1"
                />
              </div>

              <Card.Footer>
                <Button
                  type="button"
                  onClick={() => router.back()}
                  className="border border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.ocppId || !formData.name}
                  className="bg-blue-600 text-white hover:bg-blue-500"
                >
                  {isSubmitting ? 'Creating...' : 'Create Station'}
                </Button>
              </Card.Footer>
            </form>
          </Card.Body>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export default NewStation;
