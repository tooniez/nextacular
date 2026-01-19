import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function DatiOcppTab({ formData, handleInputChange, station }) {
  const formatDateTime = (date) => {
    if (!date) return '';
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm:ss', { locale: it });
    } catch {
      return '';
    }
  };

  return (
    <Card>
      <Card.Body>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Dati OCPP</h2>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Comandi
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column - General Station Data */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Nome Logico (OCPP) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ocppId}
                readOnly
                className="w-full px-4 py-2 border rounded bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Numero di Serie
              </label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleInputChange('serialNumber', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Numero di Serie Misuratore
              </label>
              <input
                type="text"
                value={formData.meterSerialNumber}
                onChange={(e) => handleInputChange('meterSerialNumber', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ultima Info Comunicata
              </label>
              <input
                type="text"
                value={formData.lastInfo}
                onChange={(e) => handleInputChange('lastInfo', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Stato Registrazione <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.registrationStatus}
                readOnly
                className={`w-full px-4 py-2 border rounded ${
                  formData.registrationStatus === 'Accettata' 
                    ? 'bg-green-50 text-green-800 border-green-200' 
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Numero di Serie Punto di Ricarica
              </label>
              <input
                type="text"
                value={formData.stationSerialNumber}
                onChange={(e) => handleInputChange('stationSerialNumber', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Versione Firmware
              </label>
              <input
                type="text"
                value={formData.firmwareVersion}
                onChange={(e) => handleInputChange('firmwareVersion', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ultimo Errore Comunicato
              </label>
              <input
                type="text"
                value={formData.lastError}
                onChange={(e) => handleInputChange('lastError', e.target.value)}
                className={`w-full px-4 py-2 border rounded ${
                  formData.lastError !== 'NoError' ? 'bg-red-50 text-red-800 border-red-200' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Stato Stazione di Ricarica
              </label>
              <input
                type="text"
                value={formData.stationStatus}
                readOnly
                className={`w-full px-4 py-2 border rounded ${
                  formData.stationStatus === 'Disponibile' || formData.stationStatus === 'AVAILABLE'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              />
            </div>
          </div>

          {/* Right Column - Station Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Marca
              </label>
              <input
                type="text"
                value={formData.vendor}
                onChange={(e) => handleInputChange('vendor', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                IccId
              </label>
              <input
                type="text"
                value={formData.iccId}
                onChange={(e) => handleInputChange('iccId', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Intervallo Collegamenti
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.connectionIntervalUnit}
                  onChange={(e) => handleInputChange('connectionIntervalUnit', e.target.value)}
                  className="w-20 px-4 py-2 border rounded"
                  placeholder="S."
                />
                <input
                  type="number"
                  value={formData.connectionInterval}
                  onChange={(e) => handleInputChange('connectionInterval', e.target.value)}
                  className="flex-1 px-4 py-2 border rounded"
                  placeholder="900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Prodotto
              </label>
              <select
                value={formData.product}
                onChange={(e) => handleInputChange('product', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="Non Specificato">Non Specificato</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ultimo Ascolto
              </label>
              <input
                type="text"
                value={formData.lastHeartbeat}
                readOnly
                className="w-full px-4 py-2 border rounded bg-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Modello
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleInputChange('model', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Imsi
              </label>
              <input
                type="text"
                value={formData.imsi}
                onChange={(e) => handleInputChange('imsi', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Connection Section */}
        <div className="mt-8 pt-6 border-t">
          <h3 className="text-lg font-semibold mb-4">Connessione</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Stato
              </label>
              <input
                type="text"
                value={formData.connectionStatus}
                readOnly
                className={`w-full px-4 py-2 border rounded ${
                  formData.connectionStatus === 'Connessa'
                    ? 'bg-green-50 text-green-800 border-green-200'
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Data
              </label>
              <input
                type="text"
                value={formData.connectionDate}
                onChange={(e) => handleInputChange('connectionDate', e.target.value)}
                className="w-full px-4 py-2 border rounded"
                placeholder="10/05/2025 11:23:44"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Motivo
              </label>
              <input
                type="text"
                value={formData.connectionReason}
                onChange={(e) => handleInputChange('connectionReason', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Ip Remoto
              </label>
              <input
                type="text"
                value={formData.remoteIp}
                onChange={(e) => handleInputChange('remoteIp', e.target.value)}
                className="w-full px-4 py-2 border rounded"
                placeholder="151.19.121.235"
              />
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}