import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function UbicazioneTab({ formData, handleInputChange, workspaces, station }) {
  return (
    <Card>
      <Card.Body>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Etichetta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Indirizzo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Comune <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.comune}
                onChange={(e) => handleInputChange('comune', e.target.value)}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                CAP <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.cap}
                onChange={(e) => handleInputChange('cap', e.target.value)}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Provincia <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.provincia}
                onChange={(e) => handleInputChange('provincia', e.target.value)}
                className="w-full px-4 py-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Stato <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.stato}
                onChange={(e) => handleInputChange('stato', e.target.value)}
                className="w-full px-4 py-2 border rounded"
                required
              >
                <option value="Italia">Italia</option>
                <option value="Altro">Altro</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Latitudine
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.latitude}
                  onChange={(e) => handleInputChange('latitude', e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Longitudine
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.longitude}
                  onChange={(e) => handleInputChange('longitude', e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
            </div>

            <div>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Q Coordinate
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Accessibilità
              </label>
              <select
                value={formData.accessibility}
                onChange={(e) => handleInputChange('accessibility', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="Accesso Gratuito al Pubblico">Accesso Gratuito al Pubblico</option>
                <option value="Accesso Limitato">Accesso Limitato</option>
                <option value="Accesso Privato">Accesso Privato</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Luogo di Installazione
              </label>
              <select
                value={formData.installationLocation}
                onChange={(e) => handleInputChange('installationLocation', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="Sulla Strada">Sulla Strada</option>
                <option value="Parcheggio Pubblico">Parcheggio Pubblico</option>
                <option value="Parcheggio Privato">Parcheggio Privato</option>
                <option value="Area Commerciale">Area Commerciale</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Informazioni Addizionali (x Clienti)
              </label>
              <input
                type="text"
                value={formData.additionalInfo}
                onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Stazione Attiva
              </label>
              <select
                value={formData.isActive ? 'Si' : 'No'}
                onChange={(e) => handleInputChange('isActive', e.target.value === 'Si')}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Pubblica
              </label>
              <select
                value={formData.isPublic ? 'Si' : 'No'}
                onChange={(e) => handleInputChange('isPublic', e.target.value === 'Si')}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Prenotabile
              </label>
              <select
                value={formData.isReservable ? 'Si' : 'No'}
                onChange={(e) => handleInputChange('isReservable', e.target.value === 'Si')}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Organizzazione
              </label>
              <select
                value={formData.workspaceId}
                onChange={(e) => handleInputChange('workspaceId', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="">Seleziona...</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Referente
              </label>
              <input
                type="text"
                value={formData.referente}
                onChange={(e) => handleInputChange('referente', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                E-Mail Referente
              </label>
              <input
                type="email"
                value={formData.referenteEmail}
                onChange={(e) => handleInputChange('referenteEmail', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Telefono Referente
              </label>
              <input
                type="tel"
                value={formData.referenteTelefono}
                onChange={(e) => handleInputChange('referenteTelefono', e.target.value)}
                className="w-full px-4 py-2 border rounded"
                placeholder="Telefono Referente..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Cellulare Referente
              </label>
              <input
                type="tel"
                value={formData.referenteCellulare}
                onChange={(e) => handleInputChange('referenteCellulare', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Data Installazione
              </label>
              <input
                type="date"
                value={formData.installationDate}
                onChange={(e) => handleInputChange('installationDate', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Installatore
              </label>
              <select
                value={formData.installer}
                onChange={(e) => handleInputChange('installer', e.target.value)}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="Non Specificato">Non Specificato</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Costo Mensile Piattaforma
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">€.</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monthlyPlatformCost}
                  onChange={(e) => handleInputChange('monthlyPlatformCost', e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Costo su Ricarica
              </label>
              <div className="relative">
                <span className="absolute right-3 top-3 text-gray-500">%</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.costPerCharge}
                  onChange={(e) => handleInputChange('costPerCharge', e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Costo Energia per kWh
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">€.</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.energyCostPerKwh}
                  onChange={(e) => handleInputChange('energyCostPerKwh', e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border rounded"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Aperta 24 Ore
              </label>
              <select
                value={formData.open24Hours ? 'Si' : 'No'}
                onChange={(e) => handleInputChange('open24Hours', e.target.value === 'Si')}
                className="w-full px-4 py-2 border rounded"
              >
                <option value="Si">Si</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Note (x Organizzazione)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-4 py-2 border rounded"
              rows="4"
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500">(*) Campo Obbligatorio</p>
        </div>

        <div className="mt-6">
          <Button
            onClick={() => {
              if (confirm('Sei sicuro di voler cancellare questa stazione?')) {
                // Handle delete - will be implemented
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            Cancella Stazione
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}