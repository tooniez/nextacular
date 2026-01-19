/**
 * Super Admin Station Edit Page
 * Complete station management with 7 tabs:
 * 1. Ubicazione (Location)
 * 2. Dati OCPP (OCPP Data)
 * 3. Connettori (Connectors)
 * 4. Mappa (Map)
 * 5. QR Code
 * 6. Logo e Foto (Logo and Photo)
 * 7. White List
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import useSWR from 'swr';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  BoltIcon,
  MapPinIcon,
  QrCodeIcon,
  PhotoIcon,
  UserGroupIcon,
  TrashIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

// Robust fetcher: surface HTTP errors to SWR instead of
// silently returning an "errors" JSON that looks like data.
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


import UbicazioneTab from '@/components/admin/stations/tabs/UbicazioneTab';
import DatiOcppTab from '@/components/admin/stations/tabs/DatiOcppTab';
import ConnettoriTab from '@/components/admin/stations/tabs/ConnettoriTab';
import MappaTab from '@/components/admin/stations/tabs/MappaTab';
import QrCodeTab from '@/components/admin/stations/tabs/QrCodeTab';
import LogoFotoTab from '@/components/admin/stations/tabs/LogoFotoTab';
import WhiteListTab from '@/components/admin/stations/tabs/WhiteListTab';

export default function AdminStationEditPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  const { id } = router.query;

  const [activeTab, setActiveTab] = useState('ubicazione');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state - MUST be before any conditional returns
  const [formData, setFormData] = useState({
    // Ubicazione tab
    name: '',
    address: '',
    comune: '',
    cap: '',
    provincia: '',
    stato: 'Italia',
    latitude: '',
    longitude: '',
    accessibility: 'Accesso Gratuito al Pubblico',
    installationLocation: 'Sulla Strada',
    additionalInfo: '',
    isActive: true,
    isPublic: true,
    isReservable: true,
    workspaceId: '',
    referente: '',
    referenteEmail: '',
    referenteTelefono: '',
    referenteCellulare: '',
    installationDate: '',
    installer: 'Non Specificato',
    monthlyPlatformCost: 10,
    costPerCharge: 0,
    energyCostPerKwh: 0,
    open24Hours: true,
    notes: '',
    // Dati OCPP tab
    ocppId: '',
    serialNumber: '',
    meterSerialNumber: '',
    lastInfo: '',
    registrationStatus: 'Accettata',
    stationSerialNumber: '',
    lastError: 'NoError',
    stationStatus: 'Disponibile',
    vendor: '',
    iccId: '',
    connectionInterval: 900,
    connectionIntervalUnit: 'S.',
    product: 'Non Specificato',
    lastHeartbeat: '',
    model: '',
    imsi: '',
    connectionStatus: 'Connessa',
    connectionDate: '',
    connectionReason: '',
    remoteIp: '',
    ocppVersion: '',
  });

  // Fetch station data
  const { data: stationData, error: stationError, mutate: mutateStation } = useSWR(
    isSuperAdmin && id ? `/api/admin/stations/${id}` : null,
    fetcher
  );

  // Fetch workspaces for organization selector
  const { data: workspacesData } = useSWR(
    isSuperAdmin ? '/api/admin/workspaces?page=1&pageSize=100' : null,
    fetcher
  );

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.push('/account');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

  useEffect(() => {
    if (stationData?.data) {
      const station = stationData.data;
      setFormData((prev) => ({
        ...prev,
        name: station.name || '',
        address: station.location || '',
        latitude: station.latitude?.toString() || '',
        longitude: station.longitude?.toString() || '',
        ocppId: station.ocppId || '',
        vendor: station.vendor || '',
        model: station.model || '',
        firmwareVersion: station.firmwareVersion || '',
        stationStatus: station.status || 'Disponibile',
        registrationStatus: station.status === 'AVAILABLE' || station.status === 'CHARGING' ? 'Accettata' : 'Non Accettata',
        lastHeartbeat: station.lastHeartbeat
          ? format(new Date(station.lastHeartbeat), 'dd/MM/yyyy HH:mm:ss', { locale: it })
          : '',
        workspaceId: station.workspaceId || '',
        isActive: station.status !== 'OFFLINE' && station.status !== 'UNAVAILABLE',
        ocppVersion: station.ocppVersion || '',
      }));
    }
  }, [stationData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/stations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          location: formData.address,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          status: formData.stationStatus,
          ocppVersion: stationData?.data?.ocppVersion,
          vendor: formData.vendor,
          model: formData.model,
          firmwareVersion: formData.firmwareVersion,
        }),
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('Stazione aggiornata con successo');
        mutateStation();
      }
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler cancellare questa stazione? Questa azione non può essere annullata.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/stations/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('Stazione cancellata con successo');
        router.push('/admin/stations');
      }
    } catch (error) {
      toast.error('Errore durante la cancellazione');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: it });
    } catch {
      return 'N/A';
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

  if (stationError) {
    return (
      <AccountLayout>
        <Meta title="Errore" />
        <div className="p-6">
          <Card>
            <Card.Body>
              <p className="text-red-600">
                {stationError.status === 404
                  ? 'Stazione non trovata. Verifica che l’ID sia corretto.'
                  : 'Errore nel caricamento della stazione'}
              </p>
            </Card.Body>
          </Card>
        </div>
      </AccountLayout>
    );
  }

  const station = stationData?.data;
  const workspaces = workspacesData?.data?.data || [];

  // Show loading state if station data is not yet loaded
  if (!stationData && !stationError) {
    return (
      <AccountLayout>
        <Meta title="Caricamento..." />
        <div className="p-6">
          <Card>
            <Card.Body>
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Caricamento dettagli stazione...</p>
              </div>
            </Card.Body>
          </Card>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Modifica Stazione ${station?.ocppId || ''} - Super Admin`} />
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/admin/stations"
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="flex items-center gap-3">
            <BoltIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Modifica Stazione {station?.ocppId ? `(${station.ocppId})` : ''}
            </h1>
          </div>
          <div className="ml-auto">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('ubicazione')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'ubicazione'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Ubicazione
            </button>
            <button
              onClick={() => setActiveTab('dati-ocpp')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dati-ocpp'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dati OCPP
            </button>
            <button
              onClick={() => setActiveTab('connettori')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'connettori'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Connettori
            </button>
            <button
              onClick={() => setActiveTab('mappa')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mappa'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Mappa
            </button>
            <button
              onClick={() => setActiveTab('qr-code')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'qr-code'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              QR Code
            </button>
            <button
              onClick={() => setActiveTab('logo-foto')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logo-foto'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Logo e Foto
            </button>
            <button
              onClick={() => setActiveTab('white-list')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'white-list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              White List
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {!station ? (
          <Card>
            <Card.Body>
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Caricamento dettagli stazione...</p>
              </div>
            </Card.Body>
          </Card>
        ) : (
          <>
            {/* Tab: Ubicazione */}
            {activeTab === 'ubicazione' && (
              <UbicazioneTab
                formData={formData}
                handleInputChange={handleInputChange}
                workspaces={workspaces}
                station={station}
              />
            )}

            {/* Tab: Dati OCPP */}
            {activeTab === 'dati-ocpp' && (
              <DatiOcppTab
                formData={formData}
                handleInputChange={handleInputChange}
                station={station}
              />
            )}

            {/* Tab: Connettori */}
            {activeTab === 'connettori' && (
              <ConnettoriTab stationId={id} station={station} mutateStation={mutateStation} />
            )}

            {/* Tab: Mappa */}
            {activeTab === 'mappa' && (
              <MappaTab station={station} formData={formData} />
            )}

            {/* Tab: QR Code */}
            {activeTab === 'qr-code' && (
              <QrCodeTab station={station} />
            )}

            {/* Tab: Logo e Foto */}
            {activeTab === 'logo-foto' && (
              <LogoFotoTab station={station} />
            )}

            {/* Tab: White List */}
            {activeTab === 'white-list' && (
              <WhiteListTab stationId={id} />
            )}
          </>
        )}
      </div>
    </AccountLayout>
  );
}

