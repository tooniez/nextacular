import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useStation, useConnectors } from '@/hooks/data';
import TariffTab from '@/components/account/TariffTab';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';

const StationDetail = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { id, edit } = router.query;
  const workspaceSlug = workspace?.slug || router.query.workspaceSlug;
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isSubmitting, setSubmittingState] = useState(false);
  const [isEditing, setIsEditing] = useState(edit === 'true');
  
  const { station, isLoading: stationLoading, mutate: mutateStation } = useStation(workspaceSlug, id);
  const { connectors, isLoading: connectorsLoading, mutate: mutateConnectors } = useConnectors(workspaceSlug, id);

  useEffect(() => {
    // #region agent log
    if (typeof window !== 'undefined') {
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'H1',
          location: 'src/pages/account/[workspaceSlug]/stations/[id]/index.js',
          message: 'Station page state',
          data: {
            stationLoaded: !!station,
            activeTab,
            isEditing,
            hasWsContact: !!station?.workspace && (!!station?.workspace?.contactWebsiteUrl || !!station?.workspace?.contactEmail || !!station?.workspace?.contactPhone),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
    // #endregion
  }, [station, activeTab, isEditing]);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    latitude: '',
    longitude: '',
    status: 'OFFLINE',
    ocppVersion: '',
  });

  // Update form data when station loads
  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name || '',
        location: station.location || '',
        latitude: station.latitude?.toString() || '',
        longitude: station.longitude?.toString() || '',
        status: station.status || 'OFFLINE',
        ocppVersion: station.ocppVersion || '',
      });
    }
  }, [station]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleUpdateStation = async (e) => {
    e.preventDefault();
    setSubmittingState(true);

    try {
      const response = await api(`/api/stations/${id}?workspaceSlug=${workspaceSlug}`, {
        method: 'PATCH',
        body: formData,
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Station updated successfully');
        setIsEditing(false);
        mutateStation();
        router.replace(`/account/${workspaceSlug}/stations/${id}`);
      }
    } catch (error) {
      toast.error('Failed to update station');
    } finally {
      setSubmittingState(false);
    }
  };

  const handleDeleteStation = async () => {
    if (!confirm(`Are you sure you want to delete "${station?.name}"? This action cannot be undone.`)) {
      return;
    }

    setSubmittingState(true);
    try {
      const response = await api(`/api/stations/${id}?workspaceSlug=${workspaceSlug}`, {
        method: 'DELETE',
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Station deleted successfully');
        router.push(`/account/${workspaceSlug}/stations`);
      }
    } catch (error) {
      toast.error('Failed to delete station');
    } finally {
      setSubmittingState(false);
    }
  };

  if (!workspaceSlug || !id) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Station" />
        <Content.Title title="Station" subtitle="Loading..." />
      </AccountLayout>
    );
  }

  if (stationLoading) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Station" />
        <Content.Title title="Station" subtitle="Loading..." />
        <Card>
          <Card.Body />
        </Card>
      </AccountLayout>
    );
  }

  if (!station) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Station Not Found" />
        <Content.Title title="Station Not Found" subtitle="The station you're looking for doesn't exist." />
        <Content.Container>
          <Button onClick={() => router.push(`/account/${workspaceSlug}/stations`)}>
            Back to Stations
          </Button>
        </Content.Container>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | ${station.name}`} />
      <Content.Title
        title={station.name}
        subtitle={`OCPP ID: ${station.ocppId}`}
      />
      <Content.Divider />
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('connectors')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'connectors'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Connectors ({connectors?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('tariff')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tariff'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tariff
          </button>
        </nav>
      </div>

      <Content.Container>
        {/* Tab Overview */}
        {activeTab === 'overview' && (
          <>
            <Card>
              <Card.Body>
                {isEditing ? (
                <form onSubmit={handleUpdateStation} className="space-y-4">
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

                  <div>
                    <label className="block text-sm font-medium mb-1">Location</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      maxLength={200}
                      className="w-full px-4 py-2 border rounded"
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
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="CHARGING">Charging</option>
                      <option value="OFFLINE">Offline</option>
                      <option value="UNAVAILABLE">Unavailable</option>
                      <option value="FAULTED">Faulted</option>
                      <option value="PREPARING">Preparing</option>
                    </select>
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
                    />
                  </div>

                  <Card.Footer>
                    <Button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        router.replace(`/account/${workspaceSlug}/stations/${id}`);
                      }}
                      className="border border-gray-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !formData.name}
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
                      <label className="text-sm font-medium text-gray-500">OCPP ID</label>
                      <div className="mt-1 text-lg font-mono">{station.ocppId}</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <div className="mt-1 text-lg">{station.name}</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Location</label>
                      <div className="mt-1">{station.location || '—'}</div>
                    </div>

                    {(station.latitude && station.longitude) && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Coordinates</label>
                        <div className="mt-1">
                          {station.latitude}, {station.longitude}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1">
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
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">OCPP Version</label>
                      <div className="mt-1">{station.ocppVersion || '—'}</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Connectors</label>
                      <div className="mt-1">{station.connectors?.length || 0} connector(s)</div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <div className="mt-1">
                        {new Date(station.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <div className="mt-1">
                        {new Date(station.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <Card.Footer>
                    <Button
                      onClick={() => {
                        setIsEditing(true);
                        router.push(`/account/${workspaceSlug}/stations/${id}?edit=true`);
                      }}
                      className="bg-blue-600 text-white hover:bg-blue-500"
                    >
                      Edit Station
                    </Button>
                    <Button
                      onClick={handleDeleteStation}
                      disabled={isSubmitting}
                      className="bg-red-600 text-white hover:bg-red-500"
                    >
                      {isSubmitting ? 'Deleting...' : 'Delete Station'}
                    </Button>
                  </Card.Footer>
                </>
                )}
              </Card.Body>
            </Card>

            {(
              <Card>
                <Card.Body title="Contatti Sub‑CPO" subtitle="Informazioni del gestore (mostrate nella scheda colonnina)">
                  {station?.workspace?.brandLogoUrl && (
                    <div className="mb-3">
                      <img
                        src={station.workspace.brandLogoUrl}
                        alt="Sub‑CPO logo"
                        className="h-10 max-w-[240px] object-contain"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Sito web</div>
                      <div className="mt-1">
                        {station?.workspace?.contactWebsiteUrl ? (
                          <a
                            className="text-blue-600 hover:underline break-all"
                            href={station.workspace.contactWebsiteUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {station.workspace.contactWebsiteUrl}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Email</div>
                      <div className="mt-1">
                        {station?.workspace?.contactEmail ? (
                          <a className="text-blue-600 hover:underline" href={`mailto:${station.workspace.contactEmail}`}>
                            {station.workspace.contactEmail}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Telefono</div>
                      <div className="mt-1">
                        {station?.workspace?.contactPhone ? (
                          <a className="text-blue-600 hover:underline" href={`tel:${station.workspace.contactPhone}`}>
                            {station.workspace.contactPhone}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}
          </>
        )}

        {/* Tab Connectors */}
        {activeTab === 'connectors' && (
          <ConnectorsTab
            workspaceSlug={workspaceSlug}
            stationId={id}
            connectors={connectors}
            isLoading={connectorsLoading}
            mutate={mutateConnectors}
          />
        )}

        {/* Tab Tariff */}
        {activeTab === 'tariff' && (
          <TariffTab station={station} workspaceSlug={workspaceSlug} />
        )}
      </Content.Container>
    </AccountLayout>
  );
};

// Connectors Tab Component
const ConnectorsTab = ({ workspaceSlug, stationId, connectors, isLoading, mutate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setSubmittingState] = useState(false);
  const [formData, setFormData] = useState({
    connectorId: '',
    name: '',
    maxPower: '',
    connectorType: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmittingState(true);

    try {
      const response = await api(`/api/stations/${stationId}/connectors?workspaceSlug=${workspaceSlug}`, {
        method: 'POST',
        body: {
          connectorId: parseInt(formData.connectorId),
          name: formData.name,
          maxPower: formData.maxPower ? parseFloat(formData.maxPower) : null,
          connectorType: formData.connectorType,
        },
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Connector created successfully');
        setShowAddForm(false);
        setFormData({ connectorId: '', name: '', maxPower: '', connectorType: '' });
        mutate();
      }
    } catch (error) {
      toast.error('Failed to create connector');
    } finally {
      setSubmittingState(false);
    }
  };

  const handleEdit = (connector) => {
    setEditingId(connector.id);
    setFormData({
      connectorId: connector.connectorId.toString(),
      name: connector.name || '',
      maxPower: connector.maxPower?.toString() || '',
      connectorType: connector.connectorType || '',
    });
    setShowAddForm(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmittingState(true);

    try {
      const response = await api(`/api/connectors/${editingId}?workspaceSlug=${workspaceSlug}`, {
        method: 'PATCH',
        body: {
          name: formData.name,
          maxPower: formData.maxPower ? parseFloat(formData.maxPower) : null,
          connectorType: formData.connectorType,
        },
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Connector updated successfully');
        setShowAddForm(false);
        setEditingId(null);
        setFormData({ connectorId: '', name: '', maxPower: '', connectorType: '' });
        mutate();
      }
    } catch (error) {
      toast.error('Failed to update connector');
    } finally {
      setSubmittingState(false);
    }
  };

  const handleDelete = async (connectorId, connectorName) => {
    if (!confirm(`Are you sure you want to delete connector "${connectorName}"?`)) {
      return;
    }

    setSubmittingState(true);
    try {
      const response = await api(`/api/connectors/${connectorId}?workspaceSlug=${workspaceSlug}`, {
        method: 'DELETE',
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Connector deleted successfully');
        mutate();
      }
    } catch (error) {
      toast.error('Failed to delete connector');
    } finally {
      setSubmittingState(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Connectors</h3>
        <Button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setFormData({ connectorId: '', name: '', maxPower: '', connectorType: '' });
          }}
          className="bg-blue-600 text-white hover:bg-blue-500"
        >
          {showAddForm ? 'Cancel' : '+ Add Connector'}
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <Card.Body>
            <form onSubmit={editingId ? handleUpdate : handleAdd} className="space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Connector ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="connectorId"
                    value={formData.connectorId}
                    onChange={handleChange}
                    required
                    min="1"
                    className="w-full px-4 py-2 border rounded"
                    placeholder="e.g., 1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full px-4 py-2 border rounded"
                  placeholder="e.g., Connector 1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Power (kW)</label>
                <input
                  type="number"
                  name="maxPower"
                  value={formData.maxPower}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  className="w-full px-4 py-2 border rounded"
                  placeholder="e.g., 22.0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Connector Type</label>
                <input
                  type="text"
                  name="connectorType"
                  value={formData.connectorType}
                  onChange={handleChange}
                  maxLength={50}
                  className="w-full px-4 py-2 border rounded"
                  placeholder="e.g., Type2, CCS, CHAdeMO"
                />
              </div>

              <Card.Footer>
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingId(null);
                    setFormData({ connectorId: '', name: '', maxPower: '', connectorType: '' });
                  }}
                  className="border border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || (!editingId && !formData.connectorId)}
                  className="bg-blue-600 text-white hover:bg-blue-500"
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Update Connector' : 'Create Connector'}
                </Button>
              </Card.Footer>
            </form>
          </Card.Body>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <Card.Body />
        </Card>
      ) : connectors.length === 0 ? (
        <Card.Empty>No connectors found. Add your first connector to get started.</Card.Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Max Power
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {connectors.map((connector) => (
                <tr key={connector.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {connector.connectorId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {connector.name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        connector.status === 'AVAILABLE'
                          ? 'bg-green-100 text-green-800'
                          : connector.status === 'OCCUPIED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {connector.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {connector.maxPower ? `${connector.maxPower} kW` : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {connector.connectorType || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(connector)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(connector.id, connector.name || `Connector ${connector.connectorId}`)}
                      disabled={isSubmitting}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};


export default StationDetail;
