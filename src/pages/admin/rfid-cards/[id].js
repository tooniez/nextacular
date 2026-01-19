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
  CreditCardIcon,
  BanknotesIcon,
  BoltIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function AdminRfidCardDetailPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  const { id } = router.query;

  const [activeTab, setActiveTab] = useState('detail');
  const [formData, setFormData] = useState({
    serial: '',
    remainingCredit: 0,
    expirationDate: '',
    status: 'Accettata',
    type: 'Digitale',
    holderId: null,
    groupSerial: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch card data
  const { data: cardData, error: cardError, mutate: mutateCard } = useSWR(
    isSuperAdmin && id ? `/api/admin/rfid-cards/${id}` : null,
    fetcher
  );

  // Fetch payments
  const { data: paymentsData } = useSWR(
    isSuperAdmin && id && activeTab === 'payments' ? `/api/admin/rfid-cards/${id}/payments` : null,
    fetcher
  );

  // Fetch sessions
  const { data: sessionsData } = useSWR(
    isSuperAdmin && id && activeTab === 'sessions' ? `/api/admin/rfid-cards/${id}/sessions` : null,
    fetcher
  );

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.push('/account');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

  useEffect(() => {
    if (cardData?.data) {
      const card = cardData.data;
      setFormData({
        serial: card.serial || '',
        remainingCredit: card.remainingCredit || 0,
        expirationDate: card.expirationDate 
          ? format(new Date(card.expirationDate), 'yyyy-MM-dd')
          : '',
        status: card.status || 'Accettata',
        type: card.type || 'Digitale',
        holderId: card.holderId || null,
        groupSerial: card.groupSerial || '',
      });
    }
  }, [cardData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/rfid-cards?id=${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('Carta RFID aggiornata con successo');
        mutateCard();
      }
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler cancellare questa carta RFID? Questa azione non può essere annullata.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/rfid-cards?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('Carta RFID cancellata con successo');
        router.push('/admin/rfid-cards');
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

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '€ 0.00';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
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

  if (cardError) {
    return (
      <AccountLayout>
        <Meta title="Errore" />
        <div className="p-6">
          <Card>
            <Card.Body>
              <p className="text-red-600">Errore nel caricamento della carta RFID</p>
            </Card.Body>
          </Card>
        </div>
      </AccountLayout>
    );
  }

  const card = cardData?.data;
  const payments = paymentsData?.data || [];
  const sessions = sessionsData?.data || [];

  return (
    <AccountLayout>
      <Meta title="Modifica Carta Rfid - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/admin/rfid-cards"
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="flex items-center gap-3">
            <CreditCardIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Modifica Carta Rfid</h1>
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
              onClick={() => setActiveTab('detail')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'detail'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5" />
                Dettaglio Carta
              </div>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5" />
                Pagamenti
              </div>
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BoltIcon className="w-5 h-5" />
                Ricariche Veicoli
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'detail' && (
          <Card>
            <Card.Body>
              {!card ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Caricamento dettagli carta...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seriale Carta <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <CreditCardIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.serial}
                          onChange={(e) => handleInputChange('serial', e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Credito Residuo <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">€</span>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.remainingCredit}
                          onChange={(e) => handleInputChange('remainingCredit', parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Scadenza <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.expirationDate}
                          onChange={(e) => handleInputChange('expirationDate', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Stato <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="Accettata">Accettata</option>
                          <option value="Bloccata">Bloccata</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="text-xs text-gray-500 mb-4">(*) Campo Obbligatorio</p>
                      <Button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                      >
                        <TrashIcon className="w-5 h-5 mr-2" />
                        {isDeleting ? 'Cancellazione...' : 'Cancella Carta Rfid'}
                      </Button>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={formData.type}
                          onChange={(e) => handleInputChange('type', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="Fisica">Fisica</option>
                          <option value="Digitale">Digitale</option>
                          <option value="Virtuale">Virtuale</option>
                          <option value="Virtuale Hubject">Virtuale Hubject</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titolare
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={card.holderName && card.holderEmail 
                            ? `${card.holderName} (${card.holderEmail})`
                            : card.holderName || card.holderEmail || 'Non Assegnata'}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seriale Gruppo
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.groupSerial}
                          onChange={(e) => handleInputChange('groupSerial', e.target.value)}
                          placeholder="Seriale Gruppo..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {activeTab === 'payments' && (
          <Card>
            <Card.Body className="p-0">
              {payments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Nessun pagamento trovato per questa carta
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Canale
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Importo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Stato
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Id Autorizzazione
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateTime(payment.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span className="text-green-600 font-semibold">stripe</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              {payment.status || 'Completato'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {payment.authorizationId || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        )}

        {activeTab === 'sessions' && (
          <Card>
            <Card.Body className="p-0">
              {sessions.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Nessuna ricarica trovata per questa carta
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-blue-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Inizio e Fine
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Stato
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Stazione di Ricarica
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Transazione
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Costo x kWh / Costo x Ora
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          kWh Prelevati / Durata (HH:MM:SS)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                          Costo Ricarica
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sessions.map((session) => (
                        <tr key={session.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div>{formatDateTime(session.startTime)}</div>
                              {session.endTime && (
                                <div className="text-gray-500">{formatDateTime(session.endTime)}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="text-green-600 font-medium">
                              {session.status === 'COMPLETED' || session.status === 'FINISHED' 
                                ? 'Terminata' 
                                : session.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {session.stationIdentifier}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {session.ocppTransactionId || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="text-xs">
                              <div>€. {session.pricePerKwh?.toFixed(2) || '0.00'} x kWh</div>
                              <div>€. {session.pricePerMinute ? (session.pricePerMinute * 60).toFixed(2) : '0.00'} x Ora</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div>{session.energyKwh?.toFixed(2) || '0.00'} kWh</div>
                              <div className="text-gray-500">{session.durationFormatted || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(session.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card.Body>
          </Card>
        )}
      </div>
    </AccountLayout>
  );
}
