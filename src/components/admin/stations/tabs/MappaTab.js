import { useState } from 'react';
import Card from '@/components/Card/index';
import { MapPinIcon } from '@heroicons/react/24/outline';

export default function MappaTab({ station, formData }) {
  const [mapType, setMapType] = useState('roadmap'); // 'roadmap' or 'satellite'

  // Get coordinates from formData or station
  const latitude = formData.latitude ? parseFloat(formData.latitude) : (station?.latitude || null);
  const longitude = formData.longitude ? parseFloat(formData.longitude) : (station?.longitude || null);

  // Google Maps embed URL
  const getMapUrl = () => {
    if (!latitude || !longitude) {
      // Default to center of Italy if no coordinates
      return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11750170.269645333!2d8.224365218749998!3d41.91007150000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12d4fe82448dd203%3A0xe22cf55c24635e6f!2sItalia!5e0!3m2!1sit!2sit!4v1234567890`;
    }

    const mapTypeParam = mapType === 'satellite' ? 'k' : 'm';
    return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d${longitude}!3d${latitude}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${latitude}%2C${longitude}!5e0!3m2!1sit!2sit!4v1234567890`;
  };

  return (
    <Card>
      <Card.Body>
        <div className="space-y-4">
          {/* Map Type Tabs */}
          <div className="flex gap-4 border-b">
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-4 py-2 font-medium text-sm ${
                mapType === 'roadmap'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mappa
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-4 py-2 font-medium text-sm ${
                mapType === 'satellite'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Satellite
            </button>
          </div>

          {/* Map Display */}
          {latitude && longitude ? (
            <div className="w-full" style={{ height: '600px' }}>
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: '8px' }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={getMapUrl()}
                title="Mappa Stazione di Ricarica"
              />
            </div>
          ) : (
            <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <MapPinIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Coordinate non disponibili</p>
                <p className="text-sm text-gray-500">
                  Inserisci le coordinate (latitudine e longitudine) nella tab &quot;Ubicazione&quot; per visualizzare la mappa
                </p>
              </div>
            </div>
          )}

          {/* Coordinates Info */}
          {latitude && longitude && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPinIcon className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Coordinate Stazione</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Latitudine:</span>
                  <span className="ml-2 font-mono font-medium">{latitude}</span>
                </div>
                <div>
                  <span className="text-gray-600">Longitudine:</span>
                  <span className="ml-2 font-mono font-medium">{longitude}</span>
                </div>
              </div>
              <div className="mt-2">
                <a
                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Apri in Google Maps →
                </a>
              </div>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
