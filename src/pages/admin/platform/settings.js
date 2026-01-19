import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import {
  CogIcon,
  QuestionMarkCircleIcon,
  PuzzlePieceIcon,
  DocumentTextIcon,
  LanguageIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const fetcher = (url) => fetch(url).then((res) => res.json());

const TABS = [
  { id: 'application', name: 'Applicazione', icon: CogIcon },
  { id: 'support', name: 'Supporto', icon: QuestionMarkCircleIcon },
  { id: 'integrations', name: 'Integrazioni', icon: PuzzlePieceIcon },
  { id: 'billing', name: 'Fatturazione', icon: DocumentTextIcon },
  { id: 'languageCurrency', name: 'Lingua e Valuta', icon: LanguageIcon },
  { id: 'security', name: 'Sicurezza', icon: ShieldCheckIcon },
];

export default function AdminPlatformSettingsPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('application');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    application: {},
    support: {},
    integrations: {},
    billing: {},
    languageCurrency: {},
    security: {},
  });

  const { data, error, isLoading, mutate } = useSWR(
    isSuperAdmin ? '/api/admin/platform/settings' : null,
    fetcher
  );

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.push('/account');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

  useEffect(() => {
    if (data?.data) {
      const settings = data.data;
      const companyData = settings.companyFiscalData || {};
      
      setFormData({
        application: {
          applicationName: companyData.applicationName || 'MeCharge',
          applicationUrl: companyData.applicationUrl || 'https://on.mecharge.it/',
          serverFolder: companyData.serverFolder || '/root/MeCharge',
          ocppPlatformUrl: companyData.ocppPlatformUrl || 'wss://on.mecharge.it:8443/',
          ocppServerFolder: companyData.ocppServerFolder || '/root/MeChargeSocket',
          copyrightUrl: companyData.copyrightUrl || 'https://www.mecharge.it/',
          privacyUrl: companyData.privacyUrl || 'https://www.mecharge.it/cookie-policy/',
          termsUrl: companyData.termsUrl || 'https://www.mecharge.it/termini-utilizzo/',
          metaDescription: companyData.metaDescription || 'Mecharge® è un prodotto di Stener S.r.l. - P.IVA 09228831211',
          metaKeywords: companyData.metaKeywords || 'Stazioni di Ricarica Auto Elettriche, wallbox, Charge Station, WallStation',
        },
        support: {
          whatsapp: companyData.support?.whatsapp || '+393274624761',
          supportEmail: companyData.support?.supportEmail || 'supporto@mecharge.it',
          smtpSenderEmail: companyData.support?.smtpSenderEmail || 'no-reply@mecharge.it',
          smtpServer: companyData.support?.smtpServer || 'smtps.aruba.it',
          smtpUser: companyData.support?.smtpUser || 'no-reply@mecharge.it',
          smtpPort: companyData.support?.smtpPort || '465',
          smtpPassword: companyData.support?.smtpPassword || '',
        },
        integrations: {
          stripe: {
            apiKey: data.data.stripeSecretKey || '',
            publicKey: data.data.stripePublishableKey || '',
          },
          fatturaPerTutti: {
            apiKey: data.data.providerApiKey || '',
            password: companyData.fatturaPerTuttiPassword || '',
          },
          google: {
            mapsApiKey: data.data.googleMapsApiKey || '',
            clientId: companyData.googleClientId || '',
          },
          hubject: companyData.hubject || {
            empEndpoint: 'https://service.hubject.com',
            cpoEndpoint: 'https://service.hubject.com',
            providerId: 'IT-MEC',
            operatorId: 'IT*MEC',
            operatorList: '',
            certificate: '',
            privateKey: '',
            costPerKwh: {
              dc: '0.85',
              acTriphase: '0.68',
              acMonophase: '0.68',
              subEmp: '',
              subCpo: '',
            },
            costPerHour: {
              dc: '0',
              acTriphase: '0',
              acMonophase: '0',
              subEmp: '',
              subCpo: '',
            },
          },
        },
        billing: {
          companyName: companyData.ragioneSociale || 'Stener S.r.l.',
          address: companyData.indirizzo || 'Via S. Arena, 37',
          city: companyData.comune || 'Caserta',
          province: companyData.provincia || 'Caserta',
          country: companyData.stato || 'Italia',
          postalCode: companyData.cap || '81100',
          vatNumber: companyData.partitaIva || '09228831211',
          phone: companyData.telefono || '+39 327 462 4761',
          vatRate: settings.vatRates?.standard || 22,
          fiscalCode: companyData.codiceFiscale || '09228831211',
          fiscalRegime: companyData.regimeFiscale || 'RF01',
          vatSection: companyData.sezionaleIva || 'A',
          physicalCardCost: companyData.costoCartaFisica || '5',
          preAuthorizationAmount: companyData.preAutorizzazioneRicarica || '50',
        },
        languageCurrency: {
          language: companyData.languageCurrency?.language || 'Italiano',
          countryCode: companyData.languageCurrency?.countryCode || 'Italia',
          currencyCode: settings.currency || 'eur',
          currencySymbol: companyData.languageCurrency?.currencySymbol || '€',
          lightLogoRect: companyData.languageCurrency?.lightLogoRect || 'logo.png',
          lightLogoSquare: companyData.languageCurrency?.lightLogoSquare || 'logo_small.png',
          darkLogoRect: companyData.languageCurrency?.darkLogoRect || 'logo_dark.png',
          darkLogoSquare: companyData.languageCurrency?.darkLogoSquare || 'logo_small_dark.png',
          defaultAppearance: companyData.languageCurrency?.defaultAppearance || 'Chiaro',
          stationCodePrefix: companyData.languageCurrency?.stationCodePrefix || 'ME',
          bookingDuration: companyData.languageCurrency?.bookingDuration || '30',
        },
        security: {
          maxLoginAttempts: data.data.maxLoginAttempts || 8,
          blockDuration: companyData.security?.blockDuration || '3 mesi',
          recaptchaSiteKey: data.data.recaptchaSiteKey || '',
          recaptchaSecretKey: data.data.recaptchaSecretKey || '',
          enable2FA: data.data.enable2FA || false,
          verifyEmailOnRegistration: companyData.security?.verifyEmailOnRegistration !== undefined 
            ? companyData.security.verifyEmailOnRegistration 
            : true,
        },
      });
    }
  }, [data]);

  const handleInputChange = (section, field, value) => {
    setFormData((prev) => {
      const newData = { ...prev };
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        newData[section] = {
          ...newData[section],
          [parent]: {
            ...(newData[section][parent] || {}),
            [child]: value,
          },
        };
      } else {
        newData[section] = {
          ...newData[section],
          [field]: value,
        };
      }
      return newData;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/platform/settings', {
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
        toast.success('Impostazioni salvate con successo');
        mutate();
      }
    } catch (error) {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isLoading) {
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

  const renderApplicationTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome Applicazione <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.application.applicationName || ''}
            onChange={(e) => handleInputChange('application', 'applicationName', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Url Applicazione <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.application.applicationUrl || ''}
            onChange={(e) => handleInputChange('application', 'applicationUrl', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cartella Server <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.application.serverFolder || ''}
            onChange={(e) => handleInputChange('application', 'serverFolder', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Url Piattaforma OCPP
          </label>
          <input
            type="text"
            value={formData.application.ocppPlatformUrl || ''}
            onChange={(e) => handleInputChange('application', 'ocppPlatformUrl', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cartella Server OCPP
          </label>
          <input
            type="text"
            value={formData.application.ocppServerFolder || ''}
            onChange={(e) => handleInputChange('application', 'ocppServerFolder', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <p className="text-sm text-gray-500">(*) Campo Obbligatorio</p>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Url Copyright
          </label>
          <input
            type="text"
            value={formData.application.copyrightUrl || ''}
            onChange={(e) => handleInputChange('application', 'copyrightUrl', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Url Privacy
          </label>
          <input
            type="text"
            value={formData.application.privacyUrl || ''}
            onChange={(e) => handleInputChange('application', 'privacyUrl', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Url Condizioni Utilizzo
          </label>
          <input
            type="text"
            value={formData.application.termsUrl || ''}
            onChange={(e) => handleInputChange('application', 'termsUrl', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Descrizioni
          </label>
          <textarea
            value={formData.application.metaDescription || ''}
            onChange={(e) => handleInputChange('application', 'metaDescription', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta Parole Chiavi
          </label>
          <textarea
            value={formData.application.metaKeywords || ''}
            onChange={(e) => handleInputChange('application', 'metaKeywords', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderSupportTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cellulare (WhatsApp) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.support.whatsapp || ''}
            onChange={(e) => handleInputChange('support', 'whatsapp', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Supporto
          </label>
          <input
            type="email"
            value={formData.support.supportEmail || ''}
            onChange={(e) => handleInputChange('support', 'supportEmail', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Smtp Email Mittente
          </label>
          <input
            type="email"
            value={formData.support.smtpSenderEmail || ''}
            onChange={(e) => handleInputChange('support', 'smtpSenderEmail', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Smtp Server
          </label>
          <input
            type="text"
            value={formData.support.smtpServer || ''}
            onChange={(e) => handleInputChange('support', 'smtpServer', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Smtp User
          </label>
          <input
            type="text"
            value={formData.support.smtpUser || ''}
            onChange={(e) => handleInputChange('support', 'smtpUser', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Smtp Porta
          </label>
          <input
            type="text"
            value={formData.support.smtpPort || ''}
            onChange={(e) => handleInputChange('support', 'smtpPort', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Smtp Password
          </label>
          <input
            type="password"
            value={formData.support.smtpPassword || ''}
            onChange={(e) => handleInputChange('support', 'smtpPassword', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderIntegrationsTab = () => (
    <div className="space-y-8">
      {/* Stripe */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Stripe (Pagamenti Elettronici)</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Api Key
            </label>
            <textarea
              value={formData.integrations.stripe?.apiKey || ''}
              onChange={(e) => handleInputChange('integrations', 'stripe.apiKey', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stripe Public Key
            </label>
            <textarea
              value={formData.integrations.stripe?.publicKey || ''}
              onChange={(e) => handleInputChange('integrations', 'stripe.publicKey', e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Fattura per Tutti */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Fattura per Tutti (Fatture Elettroniche)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Api Key
            </label>
            <input
              type="text"
              value={formData.integrations.fatturaPerTutti?.apiKey || ''}
              onChange={(e) => handleInputChange('integrations', 'fatturaPerTutti.apiKey', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={formData.integrations.fatturaPerTutti?.password || ''}
              onChange={(e) => handleInputChange('integrations', 'fatturaPerTutti.password', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Google */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Google</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mappe Api Key
            </label>
            <input
              type="text"
              value={formData.integrations.google?.mapsApiKey || ''}
              onChange={(e) => handleInputChange('integrations', 'google.mapsApiKey', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log In con Google
            </label>
            <input
              type="text"
              value={formData.integrations.google?.clientId || ''}
              onChange={(e) => handleInputChange('integrations', 'google.clientId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Hubject */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Hubject</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint Servizio EMP
            </label>
            <input
              type="text"
              value={formData.integrations.hubject?.empEndpoint || ''}
              onChange={(e) => handleInputChange('integrations', 'hubject.empEndpoint', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint Servizio CPO
            </label>
            <input
              type="text"
              value={formData.integrations.hubject?.cpoEndpoint || ''}
              onChange={(e) => handleInputChange('integrations', 'hubject.cpoEndpoint', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Id Fornitore (Provider ID)
            </label>
            <input
              type="text"
              value={formData.integrations.hubject?.providerId || ''}
              onChange={(e) => handleInputChange('integrations', 'hubject.providerId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Id Operatore (Operator ID)
            </label>
            <input
              type="text"
              value={formData.integrations.hubject?.operatorId || ''}
              onChange={(e) => handleInputChange('integrations', 'hubject.operatorId', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            Caricamento Dati
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            Invio Dati
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            Caricamento Stati
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white">
            Invio Stati
          </Button>
        </div>
        <div className="mb-4">
          <h4 className="font-medium mb-2">Costo Ricarica per kWh</h4>
          <div className="grid grid-cols-5 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">C.C.</label>
              <div className="flex">
                <span className="px-2 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">€</span>
                <input
                  type="text"
                  value={formData.integrations.hubject?.costPerKwh?.dc || ''}
                  onChange={(e) => handleInputChange('integrations', 'hubject.costPerKwh.dc', e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">C.A. TriFase</label>
              <div className="flex">
                <span className="px-2 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">€</span>
                <input
                  type="text"
                  value={formData.integrations.hubject?.costPerKwh?.acTriphase || ''}
                  onChange={(e) => handleInputChange('integrations', 'hubject.costPerKwh.acTriphase', e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">C.A. MonoFase</label>
              <div className="flex">
                <span className="px-2 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">€</span>
                <input
                  type="text"
                  value={formData.integrations.hubject?.costPerKwh?.acMonophase || ''}
                  onChange={(e) => handleInputChange('integrations', 'hubject.costPerKwh.acMonophase', e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sub EMP</label>
              <input
                type="text"
                placeholder="Sub EMP..."
                value={formData.integrations.hubject?.costPerKwh?.subEmp || ''}
                onChange={(e) => handleInputChange('integrations', 'hubject.costPerKwh.subEmp', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sub CPO</label>
              <input
                type="text"
                placeholder="Sub CPO..."
                value={formData.integrations.hubject?.costPerKwh?.subCpo || ''}
                onChange={(e) => handleInputChange('integrations', 'hubject.costPerKwh.subCpo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="mb-4">
          <h4 className="font-medium mb-2">Costo Ricarica per Ora</h4>
          <div className="grid grid-cols-5 gap-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">C.C.</label>
              <div className="flex">
                <span className="px-2 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">€</span>
                <input
                  type="text"
                  value={formData.integrations.hubject?.costPerHour?.dc || ''}
                  onChange={(e) => handleInputChange('integrations', 'hubject.costPerHour.dc', e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">C.A. TriFase</label>
              <div className="flex">
                <span className="px-2 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">€</span>
                <input
                  type="text"
                  value={formData.integrations.hubject?.costPerHour?.acTriphase || ''}
                  onChange={(e) => handleInputChange('integrations', 'hubject.costPerHour.acTriphase', e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">C.A. MonoFase</label>
              <div className="flex">
                <span className="px-2 py-2 border border-r-0 border-gray-300 rounded-l-lg bg-gray-50">€</span>
                <input
                  type="text"
                  value={formData.integrations.hubject?.costPerHour?.acMonophase || ''}
                  onChange={(e) => handleInputChange('integrations', 'hubject.costPerHour.acMonophase', e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sub EMP</label>
              <input
                type="text"
                placeholder="Sub EMP..."
                value={formData.integrations.hubject?.costPerHour?.subEmp || ''}
                onChange={(e) => handleInputChange('integrations', 'hubject.costPerHour.subEmp', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sub CPO</label>
              <input
                type="text"
                placeholder="Sub CPO..."
                value={formData.integrations.hubject?.costPerHour?.subCpo || ''}
                onChange={(e) => handleInputChange('integrations', 'hubject.costPerHour.subCpo', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lista Operatori da Controllare Stato
          </label>
          <textarea
            value={formData.integrations.hubject?.operatorList || ''}
            onChange={(e) => handleInputChange('integrations', 'hubject.operatorList', e.target.value)}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="IT*ELX,IT*BEC,IT*AES,..."
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Certificato (.pem)
          </label>
          <textarea
            value={formData.integrations.hubject?.certificate || ''}
            onChange={(e) => handleInputChange('integrations', 'hubject.certificate', e.target.value)}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
            placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chiave Privata (.key)
          </label>
          <textarea
            value={formData.integrations.hubject?.privateKey || ''}
            onChange={(e) => handleInputChange('integrations', 'hubject.privateKey', e.target.value)}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
            placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
          />
        </div>
      </div>
    </div>
  );

  const renderBillingTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ragione Sociale <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.billing.companyName || ''}
            onChange={(e) => handleInputChange('billing', 'companyName', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Indirizzo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.billing.address || ''}
            onChange={(e) => handleInputChange('billing', 'address', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comune <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.billing.city || ''}
            onChange={(e) => handleInputChange('billing', 'city', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provincia <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.billing.province || ''}
            onChange={(e) => handleInputChange('billing', 'province', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Stato <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.billing.country || ''}
            onChange={(e) => handleInputChange('billing', 'country', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Italia">Italia</option>
            <option value="Other">Altro</option>
          </select>
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CAP <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.billing.postalCode || ''}
            onChange={(e) => handleInputChange('billing', 'postalCode', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Partita IVA <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.billing.vatNumber || ''}
            onChange={(e) => handleInputChange('billing', 'vatNumber', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Telefono
          </label>
          <input
            type="text"
            value={formData.billing.phone || ''}
            onChange={(e) => handleInputChange('billing', 'phone', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aliquota Iva (%)
          </label>
          <input
            type="number"
            value={formData.billing.vatRate || ''}
            onChange={(e) => handleInputChange('billing', 'vatRate', parseInt(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Codice Fiscale
          </label>
          <input
            type="text"
            value={formData.billing.fiscalCode || ''}
            onChange={(e) => handleInputChange('billing', 'fiscalCode', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Regime Fiscale
          </label>
          <input
            type="text"
            value={formData.billing.fiscalRegime || ''}
            onChange={(e) => handleInputChange('billing', 'fiscalRegime', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sezionale Iva
          </label>
          <input
            type="text"
            value={formData.billing.vatSection || ''}
            onChange={(e) => handleInputChange('billing', 'vatSection', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Costo Carta Fisica (€)
          </label>
          <input
            type="text"
            value={formData.billing.physicalCardCost || ''}
            onChange={(e) => handleInputChange('billing', 'physicalCardCost', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pre-Autorizzazione Ricarica (€)
          </label>
          <input
            type="text"
            value={formData.billing.preAuthorizationAmount || ''}
            onChange={(e) => handleInputChange('billing', 'preAuthorizationAmount', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderLanguageCurrencyTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lingua Applicazione
          </label>
          <select
            value={formData.languageCurrency.language || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'language', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Italiano">Italiano</option>
            <option value="English">English</option>
            <option value="Español">Español</option>
            <option value="Français">Français</option>
            <option value="Deutsch">Deutsch</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Codice Nazione
          </label>
          <select
            value={formData.languageCurrency.countryCode || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'countryCode', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Italia">Italia</option>
            <option value="Other">Altro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valuta (Sigla)
          </label>
          <input
            type="text"
            value={formData.languageCurrency.currencyCode || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'currencyCode', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Valuta (Simbolo)
          </label>
          <input
            type="text"
            value={formData.languageCurrency.currencySymbol || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'currencySymbol', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Logo Chiaro (Rettangolare)
          </label>
          <input
            type="text"
            value={formData.languageCurrency.lightLogoRect || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'lightLogoRect', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Logo Chiaro (Quadrato)
          </label>
          <input
            type="text"
            value={formData.languageCurrency.lightLogoSquare || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'lightLogoSquare', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Logo Scuro (Rettangolare)
          </label>
          <input
            type="text"
            value={formData.languageCurrency.darkLogoRect || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'darkLogoRect', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Logo Scuro (Quadrato)
          </label>
          <input
            type="text"
            value={formData.languageCurrency.darkLogoSquare || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'darkLogoSquare', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aspetto Predefinito
          </label>
          <select
            value={formData.languageCurrency.defaultAppearance || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'defaultAppearance', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="Chiaro">Chiaro</option>
            <option value="Scuro">Scuro</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prefisso Codice Stazioni di Ricarica
          </label>
          <input
            type="text"
            value={formData.languageCurrency.stationCodePrefix || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'stationCodePrefix', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Durata Prenotazione (Minuti)
          </label>
          <input
            type="number"
            value={formData.languageCurrency.bookingDuration || ''}
            onChange={(e) => handleInputChange('languageCurrency', 'bookingDuration', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">Attacchi di Forza Bruta</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Blocco dopo il numero di errori di accesso <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.security.maxLoginAttempts || ''}
              onChange={(e) => handleInputChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantità di tempo in cui un utente è bloccato <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.security.blockDuration || ''}
              onChange={(e) => handleInputChange('security', 'blockDuration', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1 ora">1 ora</option>
              <option value="1 giorno">1 giorno</option>
              <option value="1 settimana">1 settimana</option>
              <option value="1 mese">1 mese</option>
              <option value="3 mesi">3 mesi</option>
              <option value="6 mesi">6 mesi</option>
              <option value="1 anno">1 anno</option>
            </select>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Google reCAPTCHA</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chiave del Sito
            </label>
            <input
              type="text"
              value={formData.security.recaptchaSiteKey || ''}
              onChange={(e) => handleInputChange('security', 'recaptchaSiteKey', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chiave Segreta
            </label>
            <input
              type="text"
              value={formData.security.recaptchaSecretKey || ''}
              onChange={(e) => handleInputChange('security', 'recaptchaSecretKey', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Accesso e Registrazione</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Autenticazione a Due Fattori su Accesso
            </label>
            <select
              value={formData.security.enable2FA ? 'Si' : 'No'}
              onChange={(e) => handleInputChange('security', 'enable2FA', e.target.value === 'Si')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="No">No</option>
              <option value="Si">Si</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verifica E-Mail su Registrazione
            </label>
            <select
              value={formData.security.verifyEmailOnRegistration ? 'Si' : 'No'}
              onChange={(e) => handleInputChange('security', 'verifyEmailOnRegistration', e.target.value === 'Si')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="No">No</option>
              <option value="Si">Si</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'application':
        return renderApplicationTab();
      case 'support':
        return renderSupportTab();
      case 'integrations':
        return renderIntegrationsTab();
      case 'billing':
        return renderBillingTab();
      case 'languageCurrency':
        return renderLanguageCurrencyTab();
      case 'security':
        return renderSecurityTab();
      default:
        return null;
    }
  };

  return (
    <AccountLayout>
      <Meta title="Impostazioni - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <CogIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <Card>
          <Card.Body>
            {renderTabContent()}
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
