import { useState } from 'react';
import useSWR from 'swr';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function ConnettoriTab({ stationId, station, mutateStation }) {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectorFormData, setConnectorFormData] = useState({
    connectorId: '',
    attacco: 'Presa', // Presa or Cavo
    tipo: 'Tipo 2 CCS Combo 2',
    energia: 'C.C.', // C.C. (DC) or C.A. (AC)
    potenzaMaxKwh: '',
    attivo: true,
    costoRicaricaKwh: '',
    costoRicaricaOra: '',
    costoRicaricaKwhRoaming: '',
    costoRicaricaOraRoaming: '',
  });

  // Fetch connectors
  const { data: connectorsData, error: connectorsError, mutate: mutateConnectors } = useSWR(
    stationId ? `/api/admin/stations/${stationId}/connectors` : null,
    fetcher
  );

  const connectors = connectorsData?.data || [];

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === '') return '€ 0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '€ 0.00';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount);
  };

  const handleConnectorInputChange = (field, value) => {
    setConnectorFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenModal = (connector = null) => {
    if (connector) {
      setEditingId(connector.id);
      setConnectorFormData({
        connectorId: connector.connectorId.toString(),
        attacco: connector.connectorType?.includes('Cavo') ? 'Cavo' : 'Presa',
        tipo: connector.connectorType || 'Tipo 2 CCS Combo 2',
        energia: connector.maxPower && connector.maxPower > 50 ? 'C.C.' : 'C.A.',
        potenzaMaxKwh: connector.maxPower?.toString() || '',
        attivo: connector.status === 'AVAILABLE',
        costoRicaricaKwh: '0.69', // TODO: Get from tariff
        costoRicaricaOra: '0.00', // TODO: Get from tariff
        costoRicaricaKwhRoaming: '0.67', // TODO: Get from tariff
        costoRicaricaOraRoaming: '0.00', // TODO: Get from tariff
      });
    } else {
      setEditingId(null);
      setConnectorFormData({
        connectorId: '',
        attacco: 'Presa',
        tipo: 'Tipo 2 CCS Combo 2',
        energia: 'C.C.',
        potenzaMaxKwh: '',
        attivo: true,
        costoRicaricaKwh: '',
        costoRicaricaOra: '',
        costoRicaricaKwhRoaming: '',
        costoRicaricaOraRoaming: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSaveConnector = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingId
        ? `/api/admin/connectors/${editingId}`
        : `/api/admin/stations/${stationId}/connectors`;

      const method = editingId ? 'PATCH' : 'POST';

      const body = editingId
        ? {
            name: connectorFormData.tipo,
            status: connectorFormData.attivo ? 'AVAILABLE' : 'UNAVAILABLE',
            maxPower: connectorFormData.potenzaMaxKwh ? parseFloat(connectorFormData.potenzaMaxKwh) : null,
            connectorType: connectorFormData.tipo,
          }
        : {
            connectorId: parseInt(connectorFormData.connectorId),
            name: connectorFormData.tipo,
            maxPower: connectorFormData.potenzaMaxKwh ? parseFloat(connectorFormData.potenzaMaxKwh) : null,
            connectorType: connectorFormData.tipo,
            status: connectorFormData.attivo ? 'AVAILABLE' : 'UNAVAILABLE',
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success(editingId ? 'Connettore aggiornato con successo' : 'Connettore creato con successo');
        mutateConnectors();
        mutateStation();
        handleCloseModal();
      }
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConnector = async (connectorId, connectorName) => {
    if (!confirm(`Sei sicuro di voler eliminare il connettore "${connectorName}"?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/connectors/${connectorId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('Connettore eliminato con successo');
        mutateConnectors();
        mutateStation();
      }
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <Card.Body>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Connettori</h2>
            <Button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              + Nuovo Connettore
            </Button>
          </div>

          {connectorsError ? (
            <div className="text-red-600">Errore nel caricamento dei connettori</div>
          ) : connectors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessun connettore trovato. Aggiungi il primo connettore.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attacco
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Energia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Potenza kWh
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costi Ricarica
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costi Ricarica Roaming
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {connectors.map((connector) => {
                    // Determine attacco type from connectorType
                    const attacco = connector.connectorType?.includes('Cavo') ? 'Cavo' : 'Presa';
                    const energia = connector.maxPower && connector.maxPower > 50 ? 'C.C.' : 'C.A.';
                    
                    return (
                      <tr key={connector.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {connector.connectorId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              connector.status === 'AVAILABLE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {connector.status === 'AVAILABLE' ? 'Disponibile' : connector.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {attacco}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {connector.connectorType || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {energia}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {connector.maxPower ? `${connector.maxPower} kWh` : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          €. 0.69 X kWh, €. 0.00 X Ora
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          €. 0.67 X kWh, €. 0.00 X Ora
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {connector.status === 'AVAILABLE' ? 'Si' : 'No'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => handleOpenModal(connector)}
                            className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteConnector(connector.id, connector.name || `Connettore ${connector.connectorId}`)}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                          <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1">
                            Comandi
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Connector Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Dettaglio Connettore</h3>
            <form onSubmit={handleSaveConnector} className="space-y-4">
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={connectorFormData.connectorId}
                    onChange={(e) => handleConnectorInputChange('connectorId', e.target.value)}
                    className="w-full px-4 py-2 border rounded"
                    required
                    min="1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Attacco
                </label>
                <select
                  value={connectorFormData.attacco}
                  onChange={(e) => handleConnectorInputChange('attacco', e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="Presa">Presa</option>
                  <option value="Cavo">Cavo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tipo
                </label>
                <select
                  value={connectorFormData.tipo}
                  onChange={(e) => handleConnectorInputChange('tipo', e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="Tipo 2 CCS Combo 2">Tipo 2 CCS Combo 2</option>
                  <option value="Tipo 2">Tipo 2</option>
                  <option value="CHAdeMO">CHAdeMO</option>
                  <option value="CCS Combo 1">CCS Combo 1</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Energia
                </label>
                <select
                  value={connectorFormData.energia}
                  onChange={(e) => handleConnectorInputChange('energia', e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="C.C.">C.C.</option>
                  <option value="C.A. MonoFase">C.A. MonoFase</option>
                  <option value="C.A. TriFase">C.A. TriFase</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Potenza Massima KWh
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={connectorFormData.potenzaMaxKwh}
                  onChange={(e) => handleConnectorInputChange('potenzaMaxKwh', e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Attivo
                </label>
                <select
                  value={connectorFormData.attivo ? 'Si' : 'No'}
                  onChange={(e) => handleConnectorInputChange('attivo', e.target.value === 'Si')}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Costo Ricarica per kWh
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">€.</span>
                  <input
                    type="number"
                    step="0.01"
                    value={connectorFormData.costoRicaricaKwh}
                    onChange={(e) => handleConnectorInputChange('costoRicaricaKwh', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Costo Ricarica per Ora
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">€.</span>
                  <input
                    type="number"
                    step="0.01"
                    value={connectorFormData.costoRicaricaOra}
                    onChange={(e) => handleConnectorInputChange('costoRicaricaOra', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Costo Ricarica per kWh (Roaming)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">€.</span>
                  <input
                    type="number"
                    step="0.01"
                    value={connectorFormData.costoRicaricaKwhRoaming}
                    onChange={(e) => handleConnectorInputChange('costoRicaricaKwhRoaming', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Costo Ricarica per Ora (Roaming)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">€.</span>
                  <input
                    type="number"
                    step="0.01"
                    value={connectorFormData.costoRicaricaOraRoaming}
                    onChange={(e) => handleConnectorInputChange('costoRicaricaOraRoaming', e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border rounded"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-6">
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  className="border border-gray-300 hover:bg-gray-50"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || (!editingId && !connectorFormData.connectorId)}
                  className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvataggio...' : 'Conferma'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}