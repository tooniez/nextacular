import { useRouter } from 'next/router';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function QrCodeTab({ station }) {
  const router = useRouter();
  
  // Generate QR code URL (using external service)
  // The QR code will contain a link to the station
  const stationUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/stations/${station?.id || ''}`
    : '';
  
  const qrCodeUrl = stationUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(stationUrl)}`
    : '';

  const handleDownload = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-code-stazione-${station?.id || 'unknown'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card>
      <Card.Body>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              QR Code Stazione
            </h3>
            <p className="text-sm text-gray-600">
              Il QR code contiene un link alla pagina della stazione. Puoi scaricarlo e utilizzarlo per identificare la stazione.
            </p>
          </div>

          {station?.id ? (
            <div className="flex flex-col items-center space-y-4">
              {/* QR Code Display */}
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                {qrCodeUrl ? (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code Stazione"
                    className="w-64 h-64"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                    <p className="text-gray-500">Generazione QR Code...</p>
                  </div>
                )}
              </div>

              {/* Station URL */}
              <div className="w-full max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL Stazione
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={stationUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(stationUrl);
                      toast.success('URL copiato negli appunti');
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Copia
                  </button>
                </div>
              </div>

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                className="flex items-center space-x-2"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Scarica QR Code</span>
              </Button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Caricamento dati stazione...
              </p>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
