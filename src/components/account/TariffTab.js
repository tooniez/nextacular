import { useState } from 'react';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import { useTariffAssignments, useTariffs } from '@/hooks/data';
import api from '@/lib/common/api';

const TariffTab = ({ station, workspaceSlug }) => {
  const { assignments, isLoading: assignmentsLoading, mutate: mutateAssignments } = useTariffAssignments(workspaceSlug, station?.id);
  const { tariffs, isLoading: tariffsLoading } = useTariffs(workspaceSlug, { isActive: true, pageSize: 100 });
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [isSubmitting, setSubmittingState] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    tariffId: '',
    connectorId: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
  });

  const handleAssignChange = (e) => {
    const { name, value } = e.target;
    setAssignFormData({ ...assignFormData, [name]: value });
  };

  const handleAssignTariff = async (e) => {
    e.preventDefault();
    setSubmittingState(true);

    try {
      const response = await api(`/api/stations/${station.id}/tariff-assignments?workspaceSlug=${workspaceSlug}`, {
        method: 'POST',
        body: {
          tariffId: assignFormData.tariffId,
          connectorId: assignFormData.connectorId || undefined,
          validFrom: assignFormData.validFrom ? new Date(assignFormData.validFrom).toISOString() : undefined,
          validUntil: assignFormData.validUntil ? new Date(assignFormData.validUntil).toISOString() : undefined,
        },
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Tariff assigned successfully');
        setShowAssignForm(false);
        setAssignFormData({ tariffId: '', connectorId: '', validFrom: new Date().toISOString().split('T')[0], validUntil: '' });
        mutateAssignments();
      }
    } catch (error) {
      toast.error('Failed to assign tariff');
    } finally {
      setSubmittingState(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to remove this tariff assignment?')) {
      return;
    }

    setSubmittingState(true);
    try {
      const response = await api(`/api/stations/${station.id}/tariff-assignments?workspaceSlug=${workspaceSlug}&assignmentId=${assignmentId}`, {
        method: 'DELETE',
      });

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Tariff assignment removed successfully');
        mutateAssignments();
      }
    } catch (error) {
      toast.error('Failed to remove tariff assignment');
    } finally {
      setSubmittingState(false);
    }
  };

  if (assignmentsLoading || tariffsLoading) {
    return (
      <Card>
        <Card.Body />
      </Card>
    );
  }

  // Get active assignment (most recent valid one)
  const activeAssignment = assignments && assignments.length > 0
    ? assignments.find(a => {
        const now = new Date();
        const validFrom = new Date(a.validFrom);
        const validUntil = a.validUntil ? new Date(a.validUntil) : null;
        return validFrom <= now && (!validUntil || validUntil >= now) && a.tariff.isActive;
      }) || assignments[0]
    : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Tariff Assignment</h3>
        <Button
          onClick={() => setShowAssignForm(!showAssignForm)}
          className="bg-blue-600 text-white hover:bg-blue-500"
        >
          {showAssignForm ? 'Cancel' : '+ Assign Tariff'}
        </Button>
      </div>

      {showAssignForm && (
        <Card>
          <Card.Body>
            <form onSubmit={handleAssignTariff} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tariff <span className="text-red-500">*</span>
                </label>
                <select
                  name="tariffId"
                  value={assignFormData.tariffId}
                  onChange={handleAssignChange}
                  required
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="">Select a tariff...</option>
                  {tariffs.map((tariff) => (
                    <option key={tariff.id} value={tariff.id}>
                      {tariff.name} ({tariff.basePricePerKwh.toFixed(4)} {tariff.currency}/kWh)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Connector (optional - station-level if empty)</label>
                <select
                  name="connectorId"
                  value={assignFormData.connectorId}
                  onChange={handleAssignChange}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="">Station-level (all connectors)</option>
                  {station?.connectors?.map((connector) => (
                    <option key={connector.id} value={connector.id}>
                      Connector {connector.connectorId} {connector.name ? `(${connector.name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Valid From</label>
                  <input
                    type="date"
                    name="validFrom"
                    value={assignFormData.validFrom}
                    onChange={handleAssignChange}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Valid Until (optional)</label>
                  <input
                    type="date"
                    name="validUntil"
                    value={assignFormData.validUntil}
                    onChange={handleAssignChange}
                    className="w-full px-4 py-2 border rounded"
                  />
                </div>
              </div>

              <Card.Footer>
                <Button
                  type="button"
                  onClick={() => {
                    setShowAssignForm(false);
                    setAssignFormData({ tariffId: '', connectorId: '', validFrom: new Date().toISOString().split('T')[0], validUntil: '' });
                  }}
                  className="border border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !assignFormData.tariffId}
                  className="bg-blue-600 text-white hover:bg-blue-500"
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Tariff'}
                </Button>
              </Card.Footer>
            </form>
          </Card.Body>
        </Card>
      )}

      {activeAssignment ? (
        <Card>
          <Card.Body>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Active Tariff</label>
                <div className="mt-1">
                  <div className="text-lg font-medium">{activeAssignment.tariff.name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {activeAssignment.tariff.basePricePerKwh.toFixed(4)} {activeAssignment.tariff.currency}/kWh
                    {activeAssignment.tariff.pricePerMinute && ` + ${activeAssignment.tariff.pricePerMinute.toFixed(4)} ${activeAssignment.tariff.currency}/min`}
                    {activeAssignment.tariff.sessionStartFee && ` + ${activeAssignment.tariff.sessionStartFee.toFixed(2)} ${activeAssignment.tariff.currency} start fee`}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    MS Fee: {(activeAssignment.tariff.msFeePercent * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {activeAssignment.connector && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Applied To</label>
                  <div className="mt-1">
                    Connector {activeAssignment.connector.connectorId} {activeAssignment.connector.name ? `(${activeAssignment.connector.name})` : ''}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Valid From</label>
                  <div className="mt-1 text-sm">
                    {new Date(activeAssignment.validFrom).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Valid Until</label>
                  <div className="mt-1 text-sm">
                    {activeAssignment.validUntil ? new Date(activeAssignment.validUntil).toLocaleDateString() : 'No expiry'}
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Body>
            <div className="text-center text-gray-500 py-8">
              <p>No tariff assigned to this station.</p>
              <p className="text-sm mt-2">Assign a tariff to start charging sessions with pricing.</p>
            </div>
          </Card.Body>
        </Card>
      )}

      {assignments && assignments.length > 0 && (
        <Card>
          <Card.Body>
            <h4 className="text-md font-medium mb-4">All Assignments</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tariff
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Applied To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valid From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valid Until
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{assignment.tariff.name}</div>
                        <div className="text-xs text-gray-500">
                          {assignment.tariff.basePricePerKwh.toFixed(4)} {assignment.tariff.currency}/kWh
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {assignment.connector
                          ? `Connector ${assignment.connector.connectorId}`
                          : 'Station (all connectors)'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(assignment.validFrom).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {assignment.validUntil ? new Date(assignment.validUntil).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          disabled={isSubmitting}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default TariffTab;

