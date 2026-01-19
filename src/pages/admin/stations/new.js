import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import useSWR from 'swr';

const fetcher = async (url) => {
  const res = await fetch(url, { credentials: 'include' });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const error = new Error('Request failed');
    error.status = res.status;
    error.info = data;
    throw error;
  }
  return data;
};

export default function AdminNewStation() {
  const router = useRouter();
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  
  const [isSubmitting, setSubmittingState] = useState(false);
  const [formData, setFormData] = useState({
    ocppId: '',
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    ocppVersion: '2.0.1',
    workspaceId: '',
  });

  // Fetch workspaces for selection
  const { data: workspacesData } = useSWR(
    isSuperAdmin ? '/api/admin/workspaces?page=1&pageSize=100' : null,
    fetcher
  );

  const workspaces = workspacesData?.data?.workspaces || [];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmittingState(true);

    try {
      // Use workspace-specific API endpoint
      const workspace = workspaces.find(w => w.id === formData.workspaceId);
      if (!workspace) {
        toast.error('Seleziona un workspace');
        setSubmittingState(false);
        return;
      }

      const response = await fetch(`/api/stations?workspaceSlug=${workspace.slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ocppId: formData.ocppId,
          name: formData.name,
          location: formData.location,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          ocppVersion: formData.ocppVersion,
        }),
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('Stazione creata con successo');
        router.push(`/admin/stations/${result.data.id}`);
      }
    } catch (error) {
      toast.error('Errore durante la creazione della stazione');
      console.error(error);
    } finally {
      setSubmittingState(false);
    }
  };

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <Meta title="Caricamento..." />
        <div className="p-6">Caricamento...</div>
      </AccountLayout>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AccountLayout>
      <Meta title="Nuova Stazione - Super Admin" />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/admin/stations"
            className="p-2 hover:bg-gray-100 rounded"
          >
            ← Torna all&apos;elenco
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Nuova Stazione di Ricarica</h1>
        </div>

        <Card>
          <Card.Body>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Workspace <span className="text-red-500">*</span>
                </label>
                <select
                  name="workspaceId"
                  value={formData.workspaceId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="">Seleziona un workspace...</option>
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className="w-full px-4 py-2 border rounded"
                  placeholder="e.g., Stazione Piazza Centrale"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Indirizzo</label>
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
                  <label className="block text-sm font-medium mb-1">Latitudine</label>
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
                  <label className="block text-sm font-medium mb-1">Longitudine</label>
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
                <label className="block text-sm font-medium mb-1">Versione OCPP</label>
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
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.ocppId || !formData.name || !formData.workspaceId}
                  className="bg-blue-600 text-white hover:bg-blue-500"
                >
                  {isSubmitting ? 'Creazione...' : 'Crea Stazione'}
                </Button>
              </Card.Footer>
            </form>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
